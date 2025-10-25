import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(5, 'Password must be at least 5 characters')
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { email: rawEmail, password } = parsedCredentials.data;
        const email = rawEmail.trim().toLowerCase();

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.id = user.id || '';
        token.role = (user as any).role || 'user';
      }

      // Always fetch the latest role from database to ensure it's up-to-date
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || '';
        session.user.role = (token.role as string) || 'user';
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'apple') {
        try {
          // Check if user exists
          const normalizedEmail = user.email?.trim().toLowerCase();

          if (!normalizedEmail) {
            return false;
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, role: true },
          });

          if (!existingUser) {
            // Create new user
            const newUser = await prisma.user.create({
              data: {
                email: normalizedEmail,
                name: user.name,
                avatarUrl: user.image,
                role: 'user',
              },
            });
            user.email = normalizedEmail;
            user.id = newUser.id;
            (user as any).role = newUser.role;
          } else {
            // Set role for existing user
            user.id = existingUser.id;
            (user as any).role = existingUser.role;
            user.email = normalizedEmail;
          }
        } catch (error) {
          console.error('Error during sign in:', error);
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/',
  },
} satisfies NextAuthConfig;
