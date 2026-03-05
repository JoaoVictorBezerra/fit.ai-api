import type { auth } from "../lib/auth.js";

type SessionData = Awaited<ReturnType<(typeof auth)["api"]["getSession"]>>;

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionData;
  }
}
