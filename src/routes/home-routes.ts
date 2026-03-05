import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { authPreHandler } from "../helpers/index.js";
import { ErrorSchema, GetHomeResponseSchema } from "../schemas/index.js";
import { PrismaWorkoutPlanRepository } from "../repositories/workout/WorkoutPlanRepository.js";
import { PrismaWorkoutSessionRepository } from "../repositories/workout/WorkoutSessionRepository.js";
import { GetHomeData } from "../usecases/GetHomeData.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const workoutPlanRepository = new PrismaWorkoutPlanRepository();
const workoutSessionRepository = new PrismaWorkoutSessionRepository();

export const homeRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:date",
    schema: {
      tags: ["Home"],
      summary: "Get home page data for authenticated user",
      operationId: "getHomeData",
      params: z.object({
        date: z.string().regex(dateRegex, "Date must be in YYYY-MM-DD format"),
      }),
      response: {
        200: GetHomeResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const getHomeData = new GetHomeData(
          workoutPlanRepository,
          workoutSessionRepository,
        );
        const result = await getHomeData.execute({
          userId: request.session!.user.id as string,
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
