import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/sign-in", "/api/auth", "/~offline"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
});

export const config = {
  // Исключаем статику PWA (манифест, SW, иконки) — иначе неавторизованный запрос к
  // /sw.js или /manifest.webmanifest получил бы редирект на /sign-in и сломал установку.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|icon.png|apple-icon.png).*)",
  ],
};
