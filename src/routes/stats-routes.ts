import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { authPreHandler } from "../helpers/index.js";
import { ErrorSchema, GetStatsResponseSchema } from "../schemas/index.js";
import { GetStats } from "../usecases/GetStats.js";

export const statsRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Stats"],
      summary: "Get user workout statistics for a date range",
      operationId: "getStats",
      querystring: z.object({
        from: z.iso.date(),
        to: z.iso.date(),
      }),
      response: {
        200: GetStatsResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const getStats = new GetStats();
        const result = await getStats.execute({
          userId: request.session!.user.id as string,
          from: request.query.from,
          to: request.query.to,
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
