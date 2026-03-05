import { FastifyReply, FastifyRequest } from "fastify";

import { auth } from "../lib/auth.js";

export const authPreHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const session = await auth.api.getSession({
    headers: request.headers as HeadersInit,
  });

  if (!session) {
    return reply
      .status(401)
      .send({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  request.session = session;
};
