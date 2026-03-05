import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { authPreHandler } from "../helpers/index.js";
import {
  ErrorSchema,
  GetUserTrainDataResponseSchema,
} from "../schemas/index.js";
import { GetUserTrainData } from "../usecases/GetUserTrainData.js";

export const meRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Me"],
      summary: "Get current user training data",
      operationId: "getUserTrainData",
      response: {
        200: GetUserTrainDataResponseSchema.nullable(),
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const getUserTrainData = new GetUserTrainData();
        const result = await getUserTrainData.execute({
          userId: request.session!.user.id as string,
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
