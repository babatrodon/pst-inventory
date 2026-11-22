import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "staff", input: false },
    },
  },
  rateLimit: { enabled: true, window: 60, max: 20 },
  advanced: { database: { generateId: undefined } },
});

export type SessionUser = { id: string; name: string; email: string; role: string };
