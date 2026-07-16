"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { ticketCode, statusOf, priorityOf } from "@/lib/constants";
import { gdriveEnabled, uploadToDrive, deleteFromDrive } from "@/lib/gdrive";
import { relatedTicketUserIds, sendTicketNotification, type NotificationEvent } from "@/lib/notifications";

// ---------- Log & Notification helpers ----------

async function logActivity(userId: string, action: string, detail: string) {
  await prisma.activityLog.create({ data: { userId, action, detail } });
}

async function notify(
  userId: string,
  message: string,
  url: string,
  type: NotificationEvent = "ASSIGNMENT",
  actorId?: string
) {
  const ticketId = url.match(/^\/tickets\/([^/?]+)/)?.[1];
  if (ticketId) {
    await sendTicketNotification({ ticketId, actorId, type, message, url, recipientIds: [userId] });
    return;
  }
  await prisma.notification.create({ data: { userId, message, url, type } });
}

// ---------- Auth ----------

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?error=1");
  }

  await createSession({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    mc: user.mustChangePassword,
  });
  await logActivity(user.id, "LOGIN", "เข้าสู่ระบบ");
  redirect("/");
}

export async function logout() {
  const session = await getSession();
  if (session) await logActivity(session.id, "LOGOUT", "ออกจากระบบ");
  destroySession();
  redirect("/login");
}

// ---------- Profile ----------

export async function updateAvatar(formData: FormData) {
  const session = await requireUser();
  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) {
    redirect("/profile?error=avatar");
  }
  const url = await saveUpload(file, "Profile");
  await prisma.user.update({
    where: { id: session.id },
    data: { avatarUrl: url },
  });
  await logActivity(session.id, "UPDATE_PROFILE", "เปลี่ยนรูปโปรไฟล์");
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}

export async function changePassword(formData: FormData) {
  const session = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 6) redirect("/profile?error=short");
  if (next !== confirm) redirect("/profile?error=mismatch");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    redirect("/profile?error=wrong");
  }

  await prisma.user.update({
    where: { id: session.id },
    data: {
      passwordHash: await bcrypt.hash(next, 10),
      mustChangePassword: false,
    },
  });
  await logActivity(session.id, "CHANGE_PASSWORD", "เปลี่ยนรหัสผ่าน");
  await createSession({
    id: session.id,
    username: session.username,
    name: session.name,
    role: user.role,
    mc: false,
  });
  redirect("/profile?changed=1");
}

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// เฉพาะแอดมิน (เช็ค role จากฐานข้อมูลจริง ไม่ใช่แค่ token)
async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.id } });
  if (!me || me.role !== "ADMIN") redirect("/team?error=forbidden");
  return session;
}

// ---------- Tickets ----------

function ticketDataFromForm(formData: FormData) {
  const dueDate = String(formData.get("dueDate") ?? "");
  return {
    title: String(formData.get("title") ?? "").trim(),
    bu: String(formData.get("bu") ?? "").trim(),
    customer: String(formData.get("customer") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    priority: String(formData.get("priority") ?? "MEDIUM"),
    jobType: String(formData.get("jobType") ?? "อื่น ๆ"),
    contactChannel: String(formData.get("contactChannel") ?? "อื่น ๆ"),
    contactInfo: String(formData.get("contactInfo") ?? "").trim() || null,
    dueDate: dueDate ? new Date(dueDate) : null,
  };
}

// รายชื่อผู้รับผิดชอบจากฟอร์ม (checkbox หลายตัวชื่อ assignees)
function assigneeIdsFromForm(formData: FormData): string[] {
  return (formData.getAll("assignees") as string[]).filter(Boolean);
}

async function nextTicketNumber(): Promise<number> {
  const max = await prisma.ticket.aggregate({ _max: { number: true } });
  return (max._max.number ?? 0) + 1;
}

export async function createTicket(formData: FormData) {
  const session = await requireUser();
  const data = ticketDataFromForm(formData);
  if (!data.title || !data.customer) redirect("/tickets/new?error=1");

  // กันกดบันทึกซ้ำ: ชื่องานเดียวกันจากคนเดิมภายใน 1 นาที → พาไปงานเดิมแทน
  const dup = await prisma.ticket.findFirst({
    where: {
      title: data.title,
      createdById: session.id,
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (dup) redirect(`/tickets/${dup.id}`);

  const assigneeIds = assigneeIdsFromForm(formData);
  const status =
    String(formData.get("status") ?? "") ||
    (assigneeIds.length > 0 ? "ASSIGNED" : "NEW");

  const ticket = await prisma.ticket.create({
    data: {
      ...data,
      status,
      number: await nextTicketNumber(),
      createdById: session.id,
      assignees: { connect: assigneeIds.map((id) => ({ id })) },
    },
  });
  await logActivity(
    session.id,
    "CREATE_TICKET",
    `สร้างงาน ${ticketCode(ticket.number)}: ${ticket.title}`
  );
  for (const id of assigneeIds) {
    if (id !== session.id) {
      await notify(
        id,
        `${session.name} มอบหมายงาน ${ticketCode(ticket.number)}: ${ticket.title}`,
        `/tickets/${ticket.id}`
      );
    }
  }
  revalidatePath("/");
  redirect(`/tickets/${ticket.id}?toast=created`);
}

// เพิ่มงานด่วนจากตาราง (สไตล์ monday "+ Add task")
export async function quickAddTicket(formData: FormData) {
  const session = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const bu = String(formData.get("bu") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const quickAssignee = String(formData.get("assigneeId") ?? "") || null;
  let status = String(formData.get("status") ?? "NEW");
  if (quickAssignee && status === "NEW") status = "ASSIGNED";
  // ต้องมีชื่องานและชื่อลูกค้าเสมอ
  if (!title || !customer) return;

  // กันกดบันทึกซ้ำ: ชื่องานเดียวกันจากคนเดิมภายใน 1 นาที ไม่สร้างซ้ำ
  const dup = await prisma.ticket.findFirst({
    where: {
      title,
      createdById: session.id,
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (dup) return;

  const ticket = await prisma.ticket.create({
    data: {
      title,
      bu,
      customer,
      status,
      number: await nextTicketNumber(),
      priority: "MEDIUM",
      jobType: "อื่น ๆ",
      contactChannel: "อื่น ๆ",
      createdById: session.id,
      ...(quickAssignee
        ? { assignees: { connect: { id: quickAssignee } } }
        : {}),
    },
  });
  await logActivity(
    session.id,
    "CREATE_TICKET",
    `สร้างงาน ${ticketCode(ticket.number)}: ${title}`
  );
  if (quickAssignee && quickAssignee !== session.id) {
    await notify(
      quickAssignee,
      `${session.name} มอบหมายงาน ${ticketCode(ticket.number)}: ${title}`,
      `/tickets/${ticket.id}`
    );
  }
  revalidatePath("/tickets");
  revalidatePath("/");
}

export async function updateTicket(id: string, formData: FormData) {
  const session = await requireUser();
  const data = ticketDataFromForm(formData);
  const status = String(formData.get("status") ?? "NEW");
  const assigneeIds = assigneeIdsFromForm(formData);
  const before = await prisma.ticket.findUnique({
    where: { id },
    include: { assignees: { select: { id: true } } },
  });
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      ...data,
      status,
      // เข้าสถานะเสร็จสิ้น → ตั้งวันที่เสร็จอัตโนมัติ / ออกจากเสร็จสิ้น → ล้าง
      ...(status === "DONE"
        ? { completedAt: before?.completedAt ?? new Date() }
        : { completedAt: null }),
      assignees: { set: assigneeIds.map((uid) => ({ id: uid })) },
    },
  });
  await logActivity(
    session.id,
    "UPDATE_TICKET",
    `แก้ไขงาน ${ticketCode(ticket.number)}: ${ticket.title}`
  );
  // แจ้งเตือนเฉพาะคนที่เพิ่งถูกเพิ่มเข้ามา
  const beforeIds = new Set((before?.assignees ?? []).map((a) => a.id));
  for (const uid of assigneeIds) {
    if (!beforeIds.has(uid) && uid !== session.id) {
      await notify(
        uid,
        `${session.name} มอบหมายงาน ${ticketCode(ticket.number)}: ${ticket.title}`,
        `/tickets/${id}`
      );
    }
  }
  revalidatePath("/");
  redirect(`/tickets/${id}?toast=updated`);
}

// สำหรับ inline editing ในตาราง (คลิกเปลี่ยนได้เลยแบบ monday)
export async function setTicketStatus(ticketId: string, status: string) {
  const session = await requireUser();
  const before = await prisma.ticket.findUnique({ where: { id: ticketId } });
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      ...(status === "DONE"
        ? { completedAt: before?.completedAt ?? new Date() }
        : { completedAt: null }),
    },
  });
  await logActivity(
    session.id,
    "UPDATE_STATUS",
    `เปลี่ยนสถานะ ${ticketCode(ticket.number)} เป็น "${statusOf(status).label}"`
  );
  await sendTicketNotification({
    ticketId,
    actorId: session.id,
    type: "STATUS_CHANGE",
    message: `${session.name} เปลี่ยนสถานะ ${ticketCode(ticket.number)} เป็น "${statusOf(status).label}"`,
    recipientIds: await relatedTicketUserIds(ticketId),
  });
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/board");
}

export async function setTicketPriority(ticketId: string, priority: string) {
  const session = await requireUser();
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority },
  });
  await logActivity(
    session.id,
    "UPDATE_PRIORITY",
    `เปลี่ยนความสำคัญ ${ticketCode(ticket.number)} เป็น "${priorityOf(priority).label}"`
  );
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/board");
}

// เพิ่ม/ถอดผู้รับผิดชอบทีละคน (มอบหมายได้หลายคน)
export async function toggleTicketAssignee(ticketId: string, userId: string) {
  const session = await requireUser();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { assignees: { select: { id: true } } },
  });
  if (!ticket) return;
  const has = ticket.assignees.some((a) => a.id === userId);
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignees: has
        ? { disconnect: { id: userId } }
        : { connect: { id: userId } },
      // มอบหมายคนแรกให้งานใหม่ → เปลี่ยนสถานะเป็น "มอบหมายแล้ว" อัตโนมัติ
      ...(!has && ticket.status === "NEW" ? { status: "ASSIGNED" } : {}),
    },
  });
  const u = await prisma.user.findUnique({ where: { id: userId } });
  await logActivity(
    session.id,
    "ASSIGN",
    `${has ? "ถอด" : "มอบหมาย"} ${u?.name ?? "-"} ${has ? "ออกจาก" : "ให้"}งาน ${ticketCode(ticket.number)}`
  );
  if (!has && userId !== session.id) {
    await notify(
      userId,
      `${session.name} มอบหมายงาน ${ticketCode(ticket.number)}: ${ticket.title}`,
      `/tickets/${ticketId}`
    );
  }
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/board");
}

export async function updateStatus(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("ticketId"));
  const status = String(formData.get("status"));
  const before = await prisma.ticket.findUnique({ where: { id } });
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      status,
      ...(status === "DONE"
        ? { completedAt: before?.completedAt ?? new Date() }
        : { completedAt: null }),
    },
  });
  await logActivity(
    session.id,
    "UPDATE_STATUS",
    `เปลี่ยนสถานะ ${ticketCode(ticket.number)} เป็น "${statusOf(status).label}"`
  );
  await sendTicketNotification({
    ticketId: id,
    actorId: session.id,
    type: "STATUS_CHANGE",
    message: `${session.name} เปลี่ยนสถานะ ${ticketCode(ticket.number)} เป็น "${statusOf(status).label}"`,
    recipientIds: await relatedTicketUserIds(id),
  });
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath(`/tickets/${id}`);
}

export async function deleteTicket(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("ticketId"));
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  await prisma.ticket.delete({ where: { id } });
  if (ticket) {
    await logActivity(
      session.id,
      "DELETE_TICKET",
      `ลบงาน ${ticketCode(ticket.number)}: ${ticket.title}`
    );
  }
  revalidatePath("/");
  redirect("/tickets?toast=deleted");
}

// แก้ไขข้อมูลงานจากการ์ด Info โดยตรง
export async function updateInfo(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("ticketId"));
  const dueDate = String(formData.get("dueDate") ?? "");
  const completedAt = String(formData.get("completedAt") ?? "");
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      bu: String(formData.get("bu") ?? "").trim(),
      customer: String(formData.get("customer") ?? "").trim() || "-",
      jobType: String(formData.get("jobType") ?? ""),
      contactChannel: String(formData.get("contactChannel") ?? ""),
      contactInfo: String(formData.get("contactInfo") ?? "").trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
    },
  });
  await logActivity(
    session.id,
    "UPDATE_TICKET",
    `แก้ไขข้อมูลงาน ${ticketCode(ticket.number)}`
  );
  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  revalidatePath("/");
  redirect(`/tickets/${id}?toast=updated`);
}

export async function updateDescription(formData: FormData) {
  await requireUser();
  const id = String(formData.get("ticketId"));
  const description = String(formData.get("description") ?? "").trim() || null;
  await prisma.ticket.update({ where: { id }, data: { description } });
  revalidatePath(`/tickets/${id}`);
  redirect(`/tickets/${id}?toast=updated`);
}

// แก้ไขฟิลด์เดี่ยวจากตารางหลัก (inline edit)
export async function setTicketInline(
  ticketId: string,
  patch: {
    title?: string;
    customer?: string;
    bu?: string;
    jobType?: string;
    dueDate?: string | null;
  }
) {
  const session = await requireUser();
  const data: {
    title?: string;
    customer?: string;
    bu?: string;
    jobType?: string;
    dueDate?: Date | null;
  } = {};
  if (patch.title !== undefined && patch.title.trim()) data.title = patch.title.trim();
  if (patch.customer !== undefined) data.customer = patch.customer.trim() || "-";
  if (patch.bu !== undefined) data.bu = patch.bu;
  if (patch.jobType !== undefined) data.jobType = patch.jobType;
  if (patch.dueDate !== undefined)
    data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;

  const ticket = await prisma.ticket.update({ where: { id: ticketId }, data });
  await logActivity(
    session.id,
    "UPDATE_TICKET",
    `แก้ไขงาน ${ticketCode(ticket.number)}: ${ticket.title}`
  );
  revalidatePath("/tickets");
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath(`/tickets/${ticketId}`);
}

export async function setSubtaskInline(
  subtaskId: string,
  patch: { title?: string; assigneeId?: string | null; dueDate?: string | null }
) {
  await requireUser();
  const data: { title?: string; assigneeId?: string | null; dueDate?: Date | null } = {};
  if (patch.title !== undefined && patch.title.trim()) data.title = patch.title.trim();
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId;
  if (patch.dueDate !== undefined)
    data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;

  const st = await prisma.subtask.update({ where: { id: subtaskId }, data });
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${st.ticketId}`);
}

// ---------- Subtasks (งานย่อย) ----------

export async function addSubtask(formData: FormData) {
  await requireUser();
  const ticketId = String(formData.get("ticketId"));
  const title = String(formData.get("title") ?? "").trim();
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!title) return;
  await prisma.subtask.create({
    data: {
      ticketId,
      title,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  revalidatePath("/board");
}

export async function toggleSubtask(formData: FormData) {
  await requireUser();
  const id = String(formData.get("subtaskId"));
  const st = await prisma.subtask.findUnique({ where: { id } });
  if (!st) return;
  await prisma.subtask.update({ where: { id }, data: { done: !st.done } });
  revalidatePath(`/tickets/${st.ticketId}`);
  revalidatePath("/tickets");
  revalidatePath("/board");
}

export async function deleteSubtask(formData: FormData) {
  await requireUser();
  const id = String(formData.get("subtaskId"));
  const st = await prisma.subtask.findUnique({ where: { id } });
  if (!st) return;
  await prisma.subtask.delete({ where: { id } });
  revalidatePath(`/tickets/${st.ticketId}`);
  revalidatePath("/tickets");
  revalidatePath("/board");
}

// ---------- Attachments (ไฟล์แนบ / ลิงก์) ----------

// บันทึกไฟล์แนบ — ลำดับ: Google Drive (โฟลเดอร์ย่อยตามเลขงาน) → Supabase Storage → เครื่อง (dev)
async function saveUpload(file: File, folder = "General"): Promise<string> {
  if (gdriveEnabled()) {
    return uploadToDrive(file, folder);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^\w.฀-๿-]+/g, "_");
  const fname = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_KEY;
  if (supaUrl && supaKey) {
    const res = await fetch(
      `${supaUrl}/storage/v1/object/attachments/${encodeURIComponent(fname)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supaKey}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: buf,
      }
    );
    if (!res.ok) {
      throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ: ${await res.text()}`);
    }
    return `${supaUrl}/storage/v1/object/public/attachments/${encodeURIComponent(fname)}`;
  }

  // fallback: เก็บลงเครื่อง (โหมด dev)
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fname), buf);
  return `/uploads/${fname}`;
}

// ลบไฟล์จริงตามที่เก็บ (Drive / Storage / disk)
async function removeUploadedFile(url: string) {
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_KEY;
  if (url.includes("drive.google.com")) {
    await deleteFromDrive(url);
  } else if (url.startsWith("/uploads/")) {
    await unlink(path.join(process.cwd(), "public", url)).catch(() => {});
  } else if (supaUrl && supaKey && url.includes("/attachments/")) {
    const fname = url.split("/attachments/")[1];
    await fetch(`${supaUrl}/storage/v1/object/attachments/${fname}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${supaKey}` },
    }).catch(() => {});
  }
}

// จำกัด 4MB ตามเพดานของ Vercel — ไฟล์ใหญ่กว่านี้ให้ใช้ "เพิ่มลิงก์" (Google Drive)
const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function addAttachment(formData: FormData) {
  const session = await requireUser();
  const ticketId = String(formData.get("ticketId"));
  const kind = String(formData.get("kind"));

  if (kind === "link") {
    const url = String(formData.get("url") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim() || url;
    if (!url) return;
    await prisma.attachment.create({
      data: { ticketId, kind: "link", name, url, uploaderId: session.id },
    });
  } else {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0 || file.size > MAX_FILE_SIZE) return;
    const tk = await prisma.ticket.findUnique({ where: { id: ticketId } });
    try {
      const url = await saveUpload(file, tk ? ticketCode(tk.number) : "General");
      await prisma.attachment.create({
        data: { ticketId, kind: "file", name: file.name, url, uploaderId: session.id },
      });
    } catch {
      redirect(`/tickets/${ticketId}`);
    }
  }
  revalidatePath(`/tickets/${ticketId}`);
  redirect(`/tickets/${ticketId}?toast=added`);
}

export async function deleteAttachment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("attachmentId"));
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return;
  if (att.kind === "file") {
    await removeUploadedFile(att.url);
  }
  await prisma.attachment.delete({ where: { id } });
  revalidatePath(`/tickets/${att.ticketId}`);
  redirect(`/tickets/${att.ticketId}?toast=deleted`);
}

// ---------- Comments ----------

export async function addComment(formData: FormData) {
  const session = await requireUser();
  const ticketId = String(formData.get("ticketId"));
  const parentId = String(formData.get("parentId") ?? "") || null;
  const body = String(formData.get("body") ?? "").trim();
  const files = (formData.getAll("files") as File[]).filter(
    (f) => f && typeof f === "object" && f.size > 0
  );
  if (!body && files.length === 0) return;

  const ticketRec = await prisma.ticket.findUnique({ where: { id: ticketId } });
  const driveFolder = ticketRec ? ticketCode(ticketRec.number) : "General";

  const comment = await prisma.comment.create({
    data: { ticketId, parentId, body: body || "(แนบไฟล์)", authorId: session.id },
  });

  // แจ้งเตือนเจ้าของอัปเดตเมื่อมีคนตอบกลับ
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (parent && t && parent.authorId !== session.id) {
      await notify(
        parent.authorId,
        `${session.name} ตอบกลับอัปเดตของคุณใน ${ticketCode(t.number)}`,
        `/tickets/${ticketId}`
      );
    }
  }

  let failedFiles = 0;
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      failedFiles++;
      continue;
    }
    try {
      const url = await saveUpload(file, driveFolder);
      await prisma.attachment.create({
        data: {
          ticketId,
          commentId: comment.id,
          kind: "file",
          name: file.name,
          url,
          uploaderId: session.id,
        },
      });
    } catch (e) {
      // ไฟล์ไหนอัปโหลดไม่สำเร็จ ข้ามไฟล์นั้น — ข้อความยังโพสต์ได้ แต่แจ้งกลับไปให้ผู้ใช้รู้
      failedFiles++;
      console.error("[upload] แนบไฟล์ไม่สำเร็จ:", e);
    }
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (ticket) {
    await logActivity(
      session.id,
      "ADD_UPDATE",
      `เพิ่มอัปเดตใน ${ticketCode(ticket.number)}${files.length ? ` (แนบ ${files.length} ไฟล์)` : ""}`
    );

    // แจ้งเตือนคนที่ถูกแท็ก @username
    const usernames = Array.from(
      new Set((body.match(/@([\w.]+)/g) ?? []).map((m) => m.slice(1)))
    );
    if (usernames.length > 0) {
      const mentioned = await prisma.user.findMany({
        where: { username: { in: usernames } },
      });
      for (const u of mentioned) {
        if (u.id === session.id) continue;
        await notify(
          u.id,
          `${session.name} แท็กคุณใน ${ticketCode(ticket.number)}: ${body.slice(0, 80)}`,
          `/tickets/${ticketId}`
        );
      }
    }
  }
  revalidatePath(`/tickets/${ticketId}`);
  return { failed: failedFiles };
}

// แก้ไขอัปเดต — เฉพาะเจ้าของเท่านั้น
export async function editComment(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("commentId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const c = await prisma.comment.findUnique({ where: { id } });
  if (!c || c.authorId !== session.id) return; // ไม่ใช่เจ้าของ แก้ไม่ได้
  await prisma.comment.update({ where: { id }, data: { body } });
  const t = await prisma.ticket.findUnique({ where: { id: c.ticketId } });
  if (t) {
    await logActivity(session.id, "ADD_UPDATE", `แก้ไขอัปเดตใน ${ticketCode(t.number)}`);
  }
  revalidatePath(`/tickets/${c.ticketId}`);
}

// ลบอัปเดต — เฉพาะเจ้าของเท่านั้น (ตอบกลับใต้โพสต์ถูกลบตามด้วย)
export async function deleteComment(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("commentId"));
  const c = await prisma.comment.findUnique({ where: { id } });
  if (!c || c.authorId !== session.id) return;
  await prisma.comment.delete({ where: { id } });
  const t = await prisma.ticket.findUnique({ where: { id: c.ticketId } });
  if (t) {
    await logActivity(session.id, "ADD_UPDATE", `ลบอัปเดตใน ${ticketCode(t.number)}`);
  }
  revalidatePath(`/tickets/${c.ticketId}`);
}

// ---------- Users ----------

export async function createUser(formData: FormData) {
  const session = await requireAdmin();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role")) === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!username || !name || password.length < 4) redirect("/team?error=invalid");

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) redirect("/team?error=duplicate");

  await prisma.user.create({
    data: { username, name, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  await logActivity(
    session.id,
    "CREATE_USER",
    `เพิ่มสมาชิกใหม่: ${name} (@${username}) ตำแหน่ง${role === "ADMIN" ? "แอดมิน" : "สมาชิก"}`
  );
  revalidatePath("/team");
  redirect("/team?toast=done");
}

// แก้ไขข้อมูลสมาชิกจากป็อปอัพ (เฉพาะแอดมิน) — คืนผลลัพธ์ให้ป็อปอัพจัดการเอง
export async function updateUser(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const id = String(formData.get("userId"));
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const role = String(formData.get("role")) === "ADMIN" ? "ADMIN" : "MEMBER";
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!name || !username) return { ok: false, error: "invalid" };
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists && exists.id !== id) return { ok: false, error: "duplicate" };

  const data: {
    name: string;
    username: string;
    role?: string;
    passwordHash?: string;
    mustChangePassword?: boolean;
  } = { name, username };
  if (id !== admin.id) data.role = role; // เปลี่ยนตำแหน่งตัวเองไม่ได้
  if (newPassword) {
    if (newPassword.length < 4) return { ok: false, error: "invalid" };
    data.passwordHash = await bcrypt.hash(newPassword, 10);
    data.mustChangePassword = true; // ให้ตั้งรหัสใหม่เองตอน login ครั้งถัดไป
  }

  const u = await prisma.user.update({ where: { id }, data });
  await logActivity(
    admin.id,
    "UPDATE_USER",
    `แก้ไขข้อมูลสมาชิก: ${u.name} (@${u.username})${newPassword ? " + รีเซ็ตรหัสผ่าน" : ""}`
  );
  revalidatePath("/team");
  return { ok: true };
}

export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("userId"));
  const role = String(formData.get("role")) === "ADMIN" ? "ADMIN" : "MEMBER";
  if (id === admin.id) redirect("/team?error=self");
  const u = await prisma.user.update({ where: { id }, data: { role } });
  await logActivity(
    admin.id,
    "UPDATE_USER",
    `เปลี่ยนตำแหน่ง ${u.name} เป็น${role === "ADMIN" ? "แอดมิน" : "สมาชิก"}`
  );
  revalidatePath("/team");
  redirect("/team?toast=done");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("userId"));
  if (id === admin.id) redirect("/team?error=self");

  // ห้ามลบถ้ามีข้อมูลผูกอยู่ (งานที่สร้าง / อัปเดต / ไฟล์แนบ)
  const [created, comments, attachments] = await Promise.all([
    prisma.ticket.count({ where: { createdById: id } }),
    prisma.comment.count({ where: { authorId: id } }),
    prisma.attachment.count({ where: { uploaderId: id } }),
  ]);
  if (created + comments + attachments > 0) redirect("/team?error=hasdata");

  // ปลดงานย่อยที่ถูกมอบหมาย (งานหลักถูกปลดอัตโนมัติจากความสัมพันธ์)
  await prisma.subtask.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });

  const u = await prisma.user.findUnique({ where: { id } });
  await prisma.user.delete({ where: { id } });
  await logActivity(admin.id, "DELETE_USER", `ลบสมาชิก: ${u?.name ?? id}`);
  revalidatePath("/team");
  redirect("/team?toast=done");
}

// ---------- Business Units (จัดการกลุ่ม BU) ----------

export async function addBusinessUnit(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const exists = await prisma.businessUnit.findUnique({ where: { name } });
  if (exists) redirect("/team?error=budup");
  await prisma.businessUnit.create({ data: { name } });
  await logActivity(session.id, "UPDATE_BU", `เพิ่มกลุ่ม BU: ${name}`);
  revalidatePath("/", "layout");
  redirect("/team?toast=done");
}

export async function toggleBusinessUnit(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("buId"));
  const bu = await prisma.businessUnit.findUnique({ where: { id } });
  if (!bu) return;
  await prisma.businessUnit.update({ where: { id }, data: { active: !bu.active } });
  await logActivity(
    session.id,
    "UPDATE_BU",
    `${bu.active ? "ปิด" : "เปิด"}การใช้งานกลุ่ม BU: ${bu.name}`
  );
  revalidatePath("/", "layout");
  redirect("/team?toast=done");
}

export async function deleteBusinessUnit(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("buId"));
  const bu = await prisma.businessUnit.findUnique({ where: { id } });
  if (!bu) return;
  await prisma.businessUnit.delete({ where: { id } });
  await logActivity(session.id, "UPDATE_BU", `ลบกลุ่ม BU: ${bu.name}`);
  revalidatePath("/", "layout");
  redirect("/team?toast=done");
}

// ---------- Notification settings (admin only) ----------

export async function saveNotificationSettings(formData: FormData) {
  await requireAdmin();
  const checked = (name: string) => formData.get(name) === "on";
  const hours = (name: string, fallback: number) => {
    const value = Number(formData.get(name));
    return Number.isFinite(value) ? Math.max(1, Math.min(720, Math.floor(value))) : fallback;
  };
  await prisma.notificationSettings.upsert({
    where: { id: "default" },
    update: {
      notifyAssignment: checked("notifyAssignment"),
      notifyStatusChange: checked("notifyStatusChange"),
      notifyComment: checked("notifyComment"),
      notifyMention: checked("notifyMention"),
      notifyDueSoon: checked("notifyDueSoon"),
      notifyOverdue: checked("notifyOverdue"),
      dueSoonHours: hours("dueSoonHours", 48),
      overdueEscalationHours: hours("overdueEscalationHours", 24),
    },
    create: { id: "default" },
  });
  revalidatePath("/team");
}
