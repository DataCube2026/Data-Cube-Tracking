import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "dc_session";

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "datacube-dev-secret"
  );
}

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role?: string; // ADMIN | MEMBER
  mc?: boolean; // ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.id as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as string | undefined,
      mc: payload.mc as boolean | undefined,
    };
  } catch {
    return null;
  }
}

export function destroySession() {
  cookies().delete(COOKIE);
}
