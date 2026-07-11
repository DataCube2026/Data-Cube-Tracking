import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = req.cookies.get("dc_session")?.value;

  let valid = false;
  let mustChange = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.AUTH_SECRET ?? "datacube-dev-secret")
      );
      valid = true;
      mustChange = payload.mc === true;
    } catch {
      valid = false;
    }
  }

  if (!valid && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (valid && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  // บังคับเปลี่ยนรหัสผ่านครั้งแรกก่อนใช้งานหน้าอื่น
  if (
    valid &&
    mustChange &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/api")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "?first=1";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
