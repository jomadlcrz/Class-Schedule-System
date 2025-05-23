import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      program?: string;
      year?: string;
      semester?: string;
      academicYear?: string;
    } & DefaultSession["user"]
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const u = user as any;
        session.user.program = u.program || null;
        session.user.year = u.year || null;
        session.user.semester = u.semester || null;
        session.user.academicYear = u.academicYear || null;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
