import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";

export const ErrorSchema = z.object({
  error: z.string().trim().min(1),
  code: z.string().trim().min(1),
});

export const StartWorkoutSessionResponseSchema = z.object({
  userWorkoutSessionId: z.string().uuid(),
});

export const CompleteWorkoutSessionResponseSchema = z.object({
  userWorkoutSession: z.object({
    id: z.string().uuid(),
    workoutDayId: z.string().uuid(),
    startedAt: z.date(),
    completedAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  }),
});

export const GetHomeResponseSchema = z.object({
  activeWorkoutPlanid: z.string(),
  todayWorkoutDay: z
    .object({
      id: z.uuid(),
      name: z.string().trim().min(1),
      isRest: z.boolean(),
      weekDay: z.enum(WeekDay),
      estimatedDurationInSeconds: z.string(),
      exercisesCount: z.number(),
    })
    .nullable(),
  workoutStreak: z.number(),
  consistencyByDay: z.record(
    z.string(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    }),
  ),
});

export const GetStatsResponseSchema = z.object({
  workoutStreak: z.number(),
  consistencyByDay: z.record(
    z.string(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    }),
  ),
  completedWorkoutsCount: z.number(),
  conclusionRate: z.number(),
  totalTimeInSeconds: z.number(),
});

export const GetWorkoutDayByIdResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isRest: z.boolean(),
  estimatedDurationInSeconds: z.number(),
  exercises: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      order: z.number(),
      workoutDayId: z.string().uuid(),
      sets: z.number(),
      reps: z.number(),
      restTimeInSeconds: z.number(),
    }),
  ),
  weekDay: z.string(),
  sessions: z.array(
    z.object({
      id: z.string().uuid(),
      workoutDayId: z.string().uuid(),
      startedAt: z.string().optional(),
      completedAt: z.string().optional(),
    }),
  ),
});

export const GetWorkoutPlansResponseSchema = z.object({
  workoutPlans: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      userId: z.string(),
      isActive: z.boolean(),
      estimateDurationInSeconds: z.number(),
      createdAt: z.date(),
      updatedAt: z.date(),
      workoutDays: z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          workoutPlanId: z.string().uuid(),
          isRestDay: z.boolean(),
          weekDay: z.string(),
          createdAt: z.date(),
          updatedAt: z.date(),
          workoutExercises: z.array(
            z.object({
              id: z.string().uuid(),
              name: z.string(),
              order: z.number(),
              workoutDayId: z.string().uuid(),
              sets: z.number(),
              reps: z.number(),
              restTimeInSeconds: z.number(),
              createdAt: z.date(),
              updatedAt: z.date(),
            }),
          ),
        }),
      ),
    }),
  ),
});

export const GetWorkoutPlanByIdResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  workoutDays: z.array(
    z.object({
      id: z.string().uuid(),
      weekDay: z.string(),
      name: z.string(),
      isRest: z.boolean(),
      estimatedDurationInSeconds: z.number(),
      exercisesCount: z.number(),
    }),
  ),
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
