import { getServerSession } from "next-auth"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./db"
import { Session } from "next-auth"


// Extend the Session type
interface ExtendedSession extends Session {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) return null

        const isPasswordValid = await compare(credentials.password, user.password)
        if (!isPasswordValid) return null

        return user
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
      return token;
    },
    session: ({ session, token }): ExtendedSession => {
      const sessionUser = {
        id: token.id as string, // Read from token
        name: token.name as string, // Read from token
        email: token.email as string, // Read from token
        image: token.image as string | null, // Read from token
      };

      return {
        ...session,
        user: sessionUser, 
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function auth() {
  console.log(process.env.NEXTAUTH_SECRET);
  return getServerSession(authOptions) as Promise<ExtendedSession | null>
}
