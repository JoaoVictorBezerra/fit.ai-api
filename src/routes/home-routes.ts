import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "../lib/auth.js";
import { ErrorSchema, GetHomeResponseSchema } from "../schemas/index.js";
import { GetHomeData } from "../usecases/GetHomeData.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const homeRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:date",
    schema: {
      tags: ["Home"],
      summary: "Get home page data for authenticated user",
      params: z.object({
        date: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
      }),
      response: {
        200: GetHomeResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: request.headers as HeadersInit,
        });

        if (!session) {
          return reply
            .status(401)
            .send({ error: "Unauthorized", code: "UNAUTHORIZED" });
        }

        const getHomeData = new GetHomeData();
        const result = await getHomeData.execute({
          userId: session.user.id as string,
          date: request.params.date,
        });

        return reply.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};
