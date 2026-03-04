import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { auth } from "../lib/auth.js";
import {
  CompleteWorkoutSessionResponseSchema,
  ErrorSchema,
  StartWorkoutSessionResponseSchema,
  WorkoutPlanSchema,
} from "../schemas/index.js";
import { CompleteWorkoutSession } from "../usecases/CompleteWorkoutSession.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { StartWorkoutSession } from "../usecases/StartWorkoutSession.js";

export const workoutPlanRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "Create a workout plan",
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/:planId/days/:dayId/sessions",
    schema: {
      tags: ["Workout Plan"],
      summary: "Start a workout session for a plan day",
      params: z.object({
        planId: z.uuid(),
        dayId: z.uuid(),
      }),
      response: {
        201: StartWorkoutSessionResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
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

        const startWorkoutSession = new StartWorkoutSession();
        const result = await startWorkoutSession.execute({
          userId: session.user.id as string,
          planId: request.params.planId,
          dayId: request.params.dayId,
        });

        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply
            .status(404)
            .send({ error: error.message, code: "NOT_FOUND" });
        }
        if (error instanceof ForbiddenError) {
          return reply
            .status(403)
            .send({ error: error.message, code: "FORBIDDEN" });
        }
        if (error instanceof ConflictError) {
          return reply
            .status(409)
            .send({ error: error.message, code: "CONFLICT" });
        }
        app.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/sessions/:userWorkoutSessionId/complete",
    schema: {
      tags: ["Workout Plan"],
      summary: "Complete a workout session",
      params: z.object({
        userWorkoutSessionId: z.uuid(),
      }),
      response: {
        200: CompleteWorkoutSessionResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
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

        const completeWorkoutSession = new CompleteWorkoutSession();
        const result = await completeWorkoutSession.execute({
          userWorkoutSessionId: request.params.userWorkoutSessionId,
          userId: session.user.id as string,
        });

        return reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply
            .status(404)
            .send({ error: error.message, code: "NOT_FOUND" });
        }
        if (error instanceof ForbiddenError) {
          return reply
            .status(403)
            .send({ error: error.message, code: "FORBIDDEN" });
        }
        app.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};
