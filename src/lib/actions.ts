"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { ticketCode, statusOf, priorityOf } from "@/lib/constants";

// ---------- Log & Notification helpers ----------

async function logActivity(userId: string, action: string, detail: string) {
  await prisma.activityLog.create({ data: { userId, action, detail } });
}

async function notify(userId: string, message: string, url: string) {
  await prisma.notification.create({ data: { userId, message, url } });
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
  const url = await saveUpload(file);
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
    mc: false,
  });
  redirect("/profile?changed=1");
}

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// ---------- Tickets ----------

function ticketDataFromForm(formData: FormData) {
  const assigneeId = String(formData.get("assigneeId") ?? "");
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
    assigneeId: assigneeId || null,
    dueDate: dueDate ? new Date(dueDate) : null,
  };
}

async function nextTicketNumber(): Promise<number> {
  const max = await prisma.ticket.aggregate({ _max: { number: true } });
  return (max._max.number ?? 0) + 1;
}

export async function createTicket(formData: FormData) {
  const session = await requireUser();
  const data = ticketDataFromForm(formData);
  if (!data.title || !data.customer) redirect("/tickets/new?error=1");

  const status = String(formData.get("status") ?? "") || (data.assigneeId ? "ASSIGNED" : "NEW");

  const ticket = await prisma.ticket.create({
    data: { ...data, status, number: await nextTicketNumber(), createdById: session.id },
  });
  await logActivity(
    session.id,
    "CREATE_TICKET",
    `สร้างงาน ${ticketCode(ticket.number)}: ${ticket.title}`
  );
  if (data.assigneeId && data.assigneeId !== session.id) {
    await notify(
      data.assigneeId,
      `${session.name} มอบหมายงาน ${ticketCode(ticket.number)}: ${ticket.title}`,
      `/tickets/${ticket.id}`
    );
  }
  revalidatePath("/");
  redirect(`/tickets/${ticket.id}`);
}

// เพิ่มงานด่วนจากตาราง (สไตล์ monday "+ Add task")
export async function quickAddTicket(formData: FormData) {
  const session = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const bu = String(formData.get("bu") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  let status = String(formData.get("status") ?? "NEW");
  if (assigneeId && status === "NEW") status = "ASSIGNED";
  // ต้องมีชื่องานและชื่อลูกค้าเสมอ
  if (!title || !customer) return;

  const ticket = await prisma.ticket.create({
    data: {
      title,
      bu,
      customer,
      status,
      assigneeId,
      number: await nextTicketNumber(),
      priority: "MEDIUM",
      jobType: "อื่น ๆ",
      contactChannel: "อื่น ๆ",
      createdById: session.id,
    },
  });
  await logActivity(
    session.id,
    "CREATE_TICKET",
    `สร้างงาน ${ticketCode(ticket.number)}: ${title}`
  );
  if (assigneeId && assigneeId !== session.id) {
    await notify(
      assigneeId,
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
  const before = await prisma.ticket.findUnique({ where: { id } });
  const ticket = await prisma.ticket.update({
    where: { id },
    data: { ...data, status },
  });
  await logActivity(
    session.id,
    "UPDATE_TICKET",
    `แก้ไขงาน ${ticketCode(ticket.number)}: ${ticket.title}`
  );
  if (
    data.assigneeId &&
    data.assigneeId !== before?.assigneeId &&
    data.assigneeId !== session.id
  ) {
    await notify(
      data.assigneeId,
      `${session.name} มอบหมายงาน ${ticketCode(ticket.number)}: ${ticket.title}`,
      `/tickets/${id}`
    );
  }
  revalidatePath("/");
  redirect(`/tickets/${id}`);
}

// สำหรับ inline editing ในตาราง (คลิกเปลี่ยนได้เลยแบบ monday)
export async function setTicketStatus(ticketId: string, status: string) {
  const session = await requireUser();
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status },
  });
  await logActivity(
    session.id,
    "UPDATE_STATUS",
    `เปลี่ยนสถานะ ${ticketCode(ticket.number)} เป็น "${statusOf(status).label}"`
  );
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

export async function setTicketAssignee(ticketId: string, assigneeId: string | null) {
  const session = await requireUser();
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  const data: { assigneeId: string | null; status?: string } = { assigneeId };
  // มอบหมายคนให้งานใหม่ → เปลี่ยนสถานะเป็น "มอบหมายแล้ว" อัตโนมัติ
  if (assigneeId && ticket?.status === "NEW") data.status = "ASSIGNED";
  await prisma.ticket.update({ where: { id: ticketId }, data });
  if (ticket) {
    const who = assigneeId
      ? (await prisma.user.findUnique({ where: { id: assigneeId } }))?.name
      : "ไม่มอบหมาย";
    await logActivity(
      session.id,
      "ASSIGN",
      `มอบหมาย ${ticketCode(ticket.number)} ให้ ${who ?? "-"}`
    );
    if (assigneeId && assigneeId !== session.id) {
      await notify(
        assigneeId,
        `${session.name} มอบหมายงาน ${ticketCode(ticket.number)}: ${ticket.title}`,
        `/tickets/${ticketId}`
      );
    }
  }
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/board");
}

export async function updateStatus(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("ticketId"));
  const status = String(formData.get("status"));
  const ticket = await prisma.ticket.update({ where: { id }, data: { status } });
  await logActivity(
    session.id,
    "UPDATE_STATUS",
    `เปลี่ยนสถานะ ${ticketCode(ticket.number)} เป็น "${statusOf(status).label}"`
  );
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
  redirect("/tickets");
}

// แก้ไขข้อมูลงานจากการ์ด Info โดยตรง
export async function updateInfo(formData: FormData) {
  const session = await requireUser();
  const id = String(formData.get("ticketId"));
  const dueDate = String(formData.get("dueDate") ?? "");
  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      bu: String(formData.get("bu") ?? "").trim(),
      customer: String(formData.get("customer") ?? "").trim() || "-",
      jobType: String(formData.get("jobType") ?? ""),
      contactChannel: String(formData.get("contactChannel") ?? ""),
      contactInfo: String(formData.get("contactInfo") ?? "").trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
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
}

export async function updateDescription(formData: FormData) {
  await requireUser();
  const id = String(formData.get("ticketId"));
  const description = String(formData.get("description") ?? "").trim() || null;
  await prisma.ticket.update({ where: { id }, data: { description } });
  revalidatePath(`/tickets/${id}`);
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

// บันทึกไฟล์ลง public/uploads แล้วคืน URL
async function saveUpload(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safe = file.name.replace(/[^\w.฀-๿-]+/g, "_");
  const fname = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
  await writeFile(path.join(dir, fname), buf);
  return `/uploads/${fname}`;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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
    const url = await saveUpload(file);
    await prisma.attachment.create({
      data: { ticketId, kind: "file", name: file.name, url, uploaderId: session.id },
    });
  }
  revalidatePath(`/tickets/${ticketId}`);
}

export async function deleteAttachment(formData: FormData) {
  await requireUser();
  const id = String(formData.get("attachmentId"));
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return;
  if (att.kind === "file") {
    await unlink(path.join(process.cwd(), "public", att.url)).catch(() => {});
  }
  await prisma.attachment.delete({ where: { id } });
  revalidatePath(`/tickets/${att.ticketId}`);
}

// ---------- Comments ----------

export async function addComment(formData: FormData) {
  const session = await requireUser();
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") ?? "").trim();
  const files = (formData.getAll("files") as File[]).filter(
    (f) => f && typeof f === "object" && f.size > 0
  );
  if (!body && files.length === 0) return;

  const comment = await prisma.comment.create({
    data: { ticketId, body: body || "(แนบไฟล์)", authorId: session.id },
  });

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) continue;
    const url = await saveUpload(file);
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
}

// ---------- Users ----------

export async function createUser(formData: FormData) {
  await requireUser();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !name || password.length < 4) redirect("/team?error=invalid");

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) redirect("/team?error=duplicate");

  const session = await getSession();
  await prisma.user.create({
    data: { username, name, passwordHash: await bcrypt.hash(password, 10) },
  });
  if (session) {
    await logActivity(session.id, "CREATE_USER", `เพิ่มสมาชิกใหม่: ${name} (@${username})`);
  }
  revalidatePath("/team");
  redirect("/team");
}
