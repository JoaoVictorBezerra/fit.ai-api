import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

import { NotFoundError } from "./errors/index.js";
import { WeekDay } from "./generated/prisma/enums.js";
import { auth } from "./lib/auth.js";
import { CreateWorkoutPlan } from "./usecases/CreateWorkoutPlan.js";
const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "FIT.AI",
      description: "FIT.AI backend service",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:8081",
        description: "Local server",
      },
      {
        url: "https://api.fit.ai",
        description: "Production server",
      },
    ],
  },
  transform: jsonSchemaTransform,
});

app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "FIT.AI API",
        slug: "fit-ai-api",
        url: "/swagger.json",
      },
      {
        title: "FIT.AI Auth API",
        slug: "fit-ai-auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: async () => {
    return app.swagger();
  },
});

app.register(fastifyCors, {
  origin: ["http://localhost:8081"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

app.after(() => {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        // Construct request URL
        const url = new URL(request.url, `http://${request.headers.host}`);

        // Convert Fastify headers to standard Headers object
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) headers.append(key, value.toString());
        });
        // Create Fetch API-compatible request
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });
        // Process authentication request
        const response = await auth.handler(req);
        // Forward response to client
        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        reply.send(response.body ? await response.text() : null);
      } catch (error) {
        app.log.error(error);
        // app.log.error("Authentication Error:", error);
        reply.status(500).send({
          error: "Internal authentication error",
          code: "AUTH_FAILURE",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/v1/workout/plans",
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
        201: z.object({
          id: z.string(),
          name: z.string().trim().min(1),
          userId: z.string(),
          isActive: z.boolean().default(true),
          estimateDurationInSeconds: z.number().min(1),
          createdAt: z.date(),
          updatedAt: z.date().nullable(),
          workoutDays: z.array(
            z.object({
              id: z.string(),
              name: z.string().trim().min(1),
              isRestDay: z.boolean().default(false),
              weekDay: z.enum(WeekDay),
              createdAt: z.date(),
              updatedAt: z.date().nullable(),
              workoutExercises: z.array(
                z.object({
                  id: z.string(),
                  name: z.string().trim().min(1),
                  order: z.number().positive(),
                  sets: z.number().min(1),
                  reps: z.number().min(1),
                  restTimeInSeconds: z.number().positive(),
                  createdAt: z.date(),
                  updatedAt: z.date().nullable(),
                }),
              ),
            }),
          ),
        }),
        400: z.object({
          error: z.string().trim().min(1),
          code: z.string().trim().min(1),
        }),
        401: z.object({
          error: z.string().trim().min(1),
          code: z.string().trim().min(1),
        }),
        403: z.object({
          error: z.string().trim().min(1),
          code: z.string().trim().min(1),
        }),
        404: z.object({
          error: z.string().trim().min(1),
          code: z.string().trim().min(1),
        }),
        500: z.object({
          error: z.string().trim().min(1),
          code: z.string().trim().min(1),
        }),
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
    method: "GET",
    url: "/",
    schema: {
      description: "Hello World",
      tags: ["hello"],
      response: {
        200: z.object({
          message: z.string().trim().min(1),
        }),
      },
    },
    handler: () => {
      return { message: "Hello World" };
    },
  });
});

try {
  await app.listen({ port: Number(process.env.PORT) || 8081 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
