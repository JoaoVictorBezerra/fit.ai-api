import "dotenv/config";

import z from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET_KEY: z.string(),
  BETTER_AUTH_URL: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
  FRONTEND_BASE_URL: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  HOST: z.string().default("localhost"),
  API_BASE_URL: z.string().default("http://localhost:8080"),
});

export const env = envSchema.parse(process.env);
