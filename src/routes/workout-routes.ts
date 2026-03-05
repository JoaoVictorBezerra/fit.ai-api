import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { authPreHandler } from "../helpers/index.js";
import {
  CompleteWorkoutSessionResponseSchema,
  ErrorSchema,
  GetWorkoutDayByIdResponseSchema,
  GetWorkoutPlanByIdResponseSchema,
  GetWorkoutPlansResponseSchema,
  StartWorkoutSessionResponseSchema,
  WorkoutPlanSchema,
} from "../schemas/index.js";
import { CompleteWorkoutSession } from "../usecases/CompleteWorkoutSession.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { GetWorkoutDayById } from "../usecases/GetWorkoutDayById.js";
import { GetWorkoutPlanById } from "../usecases/GetWorkoutPlanById.js";
import { GetWorkoutPlans } from "../usecases/GetWorkoutPlans.js";
import { StartWorkoutSession } from "../usecases/StartWorkoutSession.js";

export const workoutPlanRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "List workout plans",
      operationId: "getWorkoutPlans",
      querystring: z.object({
        active: z
          .enum(["true", "false"])
          .optional()
          .transform((val) => (val === undefined ? undefined : val === "true")),
      }),
      response: {
        200: GetWorkoutPlansResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const getWorkoutPlans = new GetWorkoutPlans();
        const result = await getWorkoutPlans.execute({
          userId: request.session!.user.id as string,
          active: request.query.active,
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:id",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get workout plan by ID",
      operationId: "getWorkoutPlanById",
      params: z.object({
        id: z.string().uuid(),
      }),
      response: {
        200: GetWorkoutPlanByIdResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const getWorkoutPlanById = new GetWorkoutPlanById();
        const result = await getWorkoutPlanById.execute({
          userId: request.session!.user.id as string,
          planId: request.params.id,
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "Create a workout plan",
      operationId: "createWorkoutPlan",
      body: z.object({
        name: z.string(),
        workoutDays: z.array(
          z.object({
            name: z.string(),
            isRestDay: z.boolean().default(false),
            weekDay: z.enum(WeekDay),
            coverImageUrl: z.string().url().optional(),
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
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const createWorkoutPlan = new CreateWorkoutPlan();
        const result = await createWorkoutPlan.execute({
          userId: request.session!.user.id as string,
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
    method: "GET",
    url: "/:planId/days/:dayId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get workout day by ID",
      operationId: "getWorkoutDayById",
      params: z.object({
        planId: z.string().uuid(),
        dayId: z.string().uuid(),
      }),
      response: {
        200: GetWorkoutDayByIdResponseSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const getWorkoutDayById = new GetWorkoutDayById();
        const result = await getWorkoutDayById.execute({
          userId: request.session!.user.id as string,
          planId: request.params.planId,
          dayId: request.params.dayId,
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

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/:planId/days/:dayId/sessions",
    schema: {
      tags: ["Workout Plan"],
      summary: "Start a workout session for a plan day",
      operationId: "startWorkoutSession",
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
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const startWorkoutSession = new StartWorkoutSession();
        const result = await startWorkoutSession.execute({
          userId: request.session!.user.id as string,
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
      operationId: "completeWorkoutSession",
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
    preHandler: authPreHandler,
    handler: async (request, reply) => {
      try {
        const completeWorkoutSession = new CompleteWorkoutSession();
        const result = await completeWorkoutSession.execute({
          userWorkoutSessionId: request.params.userWorkoutSessionId,
          userId: request.session!.user.id as string,
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
