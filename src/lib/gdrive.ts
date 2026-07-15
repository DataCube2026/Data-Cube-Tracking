// เชื่อม Google Drive ผ่าน Service Account (ไม่ต้องติดตั้ง SDK เพิ่ม — ใช้ jose ที่มีอยู่)
// ไฟล์แนบจะถูกเก็บใน Drive: โฟลเดอร์หลัก / โฟลเดอร์ย่อยตามเลขงาน (เช่น TCUBE-004)
import { SignJWT, importPKCS8 } from "jose";

export function gdriveEnabled(): boolean {
  return !!(
    process.env.GDRIVE_CLIENT_EMAIL &&
    process.env.GDRIVE_PRIVATE_KEY &&
    process.env.GDRIVE_ROOT_FOLDER_ID
  );
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GDRIVE_CLIENT_EMAIL!;
  const pk = process.env.GDRIVE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const key = await importPKCS8(pk, "RS256");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/drive",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(email)
    .setSubject(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=" +
      encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") +
      "&assertion=" +
      jwt,
  });
  if (!res.ok) throw new Error("Google auth failed: " + (await res.text()));
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// หาโฟลเดอร์ย่อยชื่อนี้ใต้โฟลเดอร์หลัก ถ้าไม่มีให้สร้างใหม่
async function findOrCreateFolder(
  token: string,
  name: string,
  parent: string
): Promise<string> {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const found = (await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then((r) => r.json())) as { files?: { id: string }[] };
  if (found.files && found.files.length > 0) return found.files[0].id;

  const created = (await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        parents: [parent],
        mimeType: "application/vnd.google-apps.folder",
      }),
    }
  ).then((r) => r.json())) as { id: string };
  return created.id;
}

// อัปโหลดไฟล์เข้า Drive → คืนลิงก์สำหรับเปิดดู
export async function uploadToDrive(
  file: File,
  folderName: string
): Promise<string> {
  const token = await getAccessToken();
  const root = process.env.GDRIVE_ROOT_FOLDER_ID!;
  const folderId = await findOrCreateFolder(token, folderName, root);

  const meta = { name: file.name, parents: [folderId] };
  const boundary = "dcb" + Math.random().toString(36).slice(2);
  const buf = Buffer.from(await file.arrayBuffer());
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(meta) +
        `\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`
    ),
    buf,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const up = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!up.ok) throw new Error("Drive upload failed: " + (await up.text()));
  const { id } = (await up.json()) as { id: string };

  // เปิดสิทธิ์ "ทุกคนที่มีลิงก์ดูได้" เพื่อให้ทีมเปิดไฟล์ได้
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  ).catch(() => {});

  return `https://drive.google.com/file/d/${id}/view`;
}

// ลบไฟล์ออกจาก Drive (ตอนผู้ใช้กดลบไฟล์แนบ)
export async function deleteFromDrive(url: string) {
  const m = url.match(/\/file\/d\/([^/]+)/);
  if (!m) return;
  try {
    const token = await getAccessToken();
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${m[1]}?supportsAllDrives=true`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    /* เงียบไว้ */
  }
}
