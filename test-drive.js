// สคริปต์ตรวจการเชื่อม Google Drive — รัน: node test-drive.js
const fs = require("fs");

// อ่านค่าจาก .env
for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
  if (m && !line.trim().startsWith("#")) process.env[m[1]] = m[2];
}

const { createSign } = require("crypto");

async function main() {
  const email = process.env.GDRIVE_CLIENT_EMAIL;
  const pk = (process.env.GDRIVE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const root = process.env.GDRIVE_ROOT_FOLDER_ID;

  console.log("1) CLIENT_EMAIL :", email || "!! ไม่พบค่าใน .env");
  console.log(
    "2) PRIVATE_KEY  :",
    pk.startsWith("-----BEGIN") && pk.includes("-----END")
      ? "รูปแบบถูกต้อง"
      : "!! รูปแบบผิด (ต้องเริ่มด้วย -----BEGIN PRIVATE KEY----- และคง \\n ไว้)"
  );
  console.log("3) ROOT_FOLDER_ID:", root || "!! ไม่พบค่าใน .env");
  if (!email || !pk.startsWith("-----BEGIN") || !root) {
    console.log("\n>> แก้ค่าใน .env ให้ครบก่อน แล้วรันใหม่");
    return;
  }

  // สร้าง JWT + ขอ access token
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned =
    enc({ alg: "RS256", typ: "JWT" }) +
    "." +
    enc({
      iss: email,
      sub: email,
      aud: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/drive",
      iat: now,
      exp: now + 3600,
    });
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  let jwt;
  try {
    jwt = unsigned + "." + signer.sign(pk).toString("base64url");
  } catch (e) {
    console.log("4) เซ็นกุญแจ    : !! ล้มเหลว —", e.message);
    return;
  }

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=" +
      encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") +
      "&assertion=" +
      jwt,
  });
  const tok = await tokRes.json();
  console.log(
    "4) ขอ token     :",
    tokRes.ok ? "สำเร็จ" : "!! ล้มเหลว — " + JSON.stringify(tok)
  );
  if (!tokRes.ok) return;
  const token = tok.access_token;

  // เช็คโฟลเดอร์ root
  const info = await fetch(
    `https://www.googleapis.com/drive/v3/files/${root}?fields=id,name,driveId&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const infoJ = await info.json();
  if (!info.ok) {
    console.log(
      "5) เข้าถึงโฟลเดอร์: !! ล้มเหลว — " +
        JSON.stringify(infoJ) +
        "\n   >> มักแปลว่า ID ผิด หรือยังไม่ได้เพิ่มบอทเป็นสมาชิก"
    );
    return;
  }
  console.log(
    "5) เข้าถึงโฟลเดอร์: สำเร็จ (ชื่อ: " +
      infoJ.name +
      (infoJ.driveId
        ? ", อยู่ใน Shared Drive ✓)"
        : ") !! แต่อยู่ใน My Drive — Service account อัปไฟล์ลง My Drive ไม่ได้ ต้องใช้ Shared Drive")
  );

  // ทดลองอัปไฟล์จริง
  const boundary = "xdcb123";
  const meta = { name: "test-" + Date.now() + ".txt", parents: [root] };
  const body =
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(meta) +
    `\r\n--${boundary}\r\nContent-Type: text/plain\r\n\r\nhello datacube\r\n--${boundary}--`;
  const up = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const upJ = await up.json();
  console.log(
    "6) อัปโหลดทดสอบ :",
    up.ok
      ? "สำเร็จ! (ไฟล์ test-xxx.txt อยู่ในโฟลเดอร์แล้ว) — ระบบพร้อมใช้งาน"
      : "!! ล้มเหลว — " + JSON.stringify(upJ)
  );
}

main().catch((e) => console.error("ERROR:", e.message));
