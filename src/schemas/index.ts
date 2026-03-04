import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";

export const ErrorSchema = z.object({
  error: z.string().trim().min(1),
  code: z.string().trim().min(1),
});

export const WorkoutPlanSchema = z.object({
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
});
