import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:8081"],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [openAPI()],
});
