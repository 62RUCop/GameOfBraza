import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@gob/db";
import { z } from "zod";
import type { Role } from "@gob/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Self-host за прокси/по IP: origin для auth-редиректов берём из Host-заголовка
  // запроса, а не из фиксированного AUTH_URL. Без этого вход с любой машины,
  // кроме самого сервера, перебрасывает на localhost (явный AUTH_URL «схлопывает»
  // callbackUrl к своему origin). AUTH_URL имеет смысл задавать только за прокси,
  // меняющим домен/протокол; пустой — определяем хост автоматически.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.account.findUnique({ where: { email } });
        if (!user?.password) return null;

        const valid = await compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // user is only present on initial sign-in
      const typedUser = user as { role?: Role; id?: string } | undefined;
      if (typedUser?.role !== undefined) token.role = typedUser.role;
      if (typedUser?.id !== undefined) token.id = typedUser.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
