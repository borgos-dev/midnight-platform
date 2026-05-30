// auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { comparePassword } from "@/app/lib/passwords";

const isProd = process.env.NODE_ENV === "production";
const cookiePrefix = isProd ? "__Secure-" : "";

export const authOptions: NextAuthOptions = {
  // No adapter — PrismaAdapter breaks Credentials + JWT.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,

  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    csrfToken: {
      name: `${isProd ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user) return null;

        // Reject soft-deleted accounts (deletedAt set)
        if ((user as { deletedAt?: Date | null }).deletedAt) return null;

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: UserRole }).role = token.role as UserRole;
      }
      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

const handler = NextAuth(authOptions);
export default handler;
