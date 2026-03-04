import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema } from "../schemas/index.js";
import { WorkoutPlanSchema } from "../schemas/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";

export const workoutPlanRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      body: z.object({
        name: z.string(),
        workoutDays: z.array(
          z.object({
            name: z.string(),
            isRestDay: z.boolean().default(false),
            weekDay: z.enum(WeekDay),
            //weekDay: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
            exercises: z.array(
              z.object({
                order: z.number().min(0).positive(),
                name: z.string().trim().min(1),
                sets: z.number().min(1),
                reps: z.number().min(1),
                restTimeInSeconds: z.number().min(1),
              }),
            ),
          }),
        ),
      }),
      response: {
        201: WorkoutPlanSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
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

        const createWorkoutPlan = new CreateWorkoutPlan();
        const result = await createWorkoutPlan.execute({
          userId: session.user.id as string,
          name: request.body.name,
          workoutDays: request.body.workoutDays,
        });
        if (result != null)
          return reply.status(201).send({
            id: result.id,
            name: result.name,
            userId: result.userId,
            isActive: result.isActive,
            estimateDurationInSeconds: result.estimateDurationInSeconds,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            workoutDays: result.workoutDays.map((workDay) => ({
              id: workDay.id,
              name: workDay.name,
              isRestDay: workDay.isRestDay,
              weekDay: workDay.weekDay,
              workoutExercises: workDay.workoutExercises.map(
                (workoutExercise) => ({
                  id: workoutExercise.id,
                  name: workoutExercise.name,
                  order: workoutExercise.order,
                  sets: workoutExercise.sets,
                  reps: workoutExercise.reps,
                  restTimeInSeconds: workoutExercise.restTimeInSeconds,
                  createdAt: workoutExercise.createdAt,
                  updatedAt: workoutExercise.updatedAt,
                }),
              ),
              createdAt: workDay.createdAt,
              updatedAt: workDay.updatedAt,
            })),
          });

        return reply.status(400).send({
          error: "Failed to create workout plan",
          code: "FAILED_TO_CREATE_WORKOUT_PLAN",
        });
      } catch (error) {
        if (error instanceof NotFoundError)
          return reply
            .status(404)
            .send({ error: error.message, code: "NOT_FOUND" });

        app.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};
