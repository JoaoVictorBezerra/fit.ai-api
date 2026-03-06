import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";
import { env } from "./env.js";

export const auth = betterAuth({
  trustedOrigins: [env.API_BASE_URL],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [openAPI()],
});
