import {
  WeekDay,
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSession,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/db.js";

export type WorkoutPlanWithDaysExercisesAndSessions = WorkoutPlan & {
  workoutDays: (WorkoutDay & {
    workoutExercises: WorkoutExercise[];
    workoutSessions: WorkoutSession[];
  })[];
};

export type WorkoutPlanWithDays = WorkoutPlan & {
  workoutDays: WorkoutDay[];
};

export type WorkoutPlanWithDaysAndExercises = WorkoutPlan & {
  workoutDays: (WorkoutDay & {
    workoutExercises: WorkoutExercise[];
  })[];
};

export type WorkoutPlanWithDaysExercisesAndCount = WorkoutPlan & {
  workoutDays: (WorkoutDay & {
    workoutExercises: WorkoutExercise[];
    _count: { workoutExercises: number };
  })[];
};

export type WorkoutPlanWithFilteredDay = WorkoutPlan & {
  workoutDays: (WorkoutDay & {
    workoutSessions: WorkoutSession[];
  })[];
};

export interface CreateWorkoutPlanInput {
  userId: string;
  name: string;
  estimateDurationInSeconds: number;
  workoutDays: Array<{
    name: string;
    isRestDay: boolean;
    weekDay: WeekDay;
    coverImageUrl?: string;
    exercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export interface IWorkoutPlanRepository {
  findActiveByUserIdWithDaysAndSessions(
    userId: string,
  ): Promise<WorkoutPlanWithDaysExercisesAndSessions | null>;
  findActiveByUserIdWithDays(
    userId: string,
  ): Promise<WorkoutPlanWithDays | null>;
  findActiveByUserId(userId: string): Promise<WorkoutPlan | null>;
  findManyByUserId(
    userId: string,
    active?: boolean,
  ): Promise<WorkoutPlanWithDaysAndExercises[]>;
  findByIdWithDaysAndExercises(
    id: string,
  ): Promise<WorkoutPlanWithDaysExercisesAndCount | null>;
  findByIdWithDay(
    id: string,
    dayId: string,
  ): Promise<WorkoutPlanWithFilteredDay | null>;
  createWorkoutPlan(
    input: CreateWorkoutPlanInput,
  ): Promise<WorkoutPlanWithDaysAndExercises | null>;
}

export class PrismaWorkoutPlanRepository implements IWorkoutPlanRepository {
  async findActiveByUserIdWithDaysAndSessions(
    userId: string,
  ): Promise<WorkoutPlanWithDaysExercisesAndSessions | null> {
    return prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        workoutDays: {
          include: {
            workoutExercises: true,
            workoutSessions: true,
          },
        },
      },
    });
  }

  async findActiveByUserIdWithDays(
    userId: string,
  ): Promise<WorkoutPlanWithDays | null> {
    return prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: { workoutDays: true },
    });
  }

  async findActiveByUserId(userId: string): Promise<WorkoutPlan | null> {
    return prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
    });
  }

  async findManyByUserId(
    userId: string,
    active?: boolean,
  ): Promise<WorkoutPlanWithDaysAndExercises[]> {
    return prisma.workoutPlan.findMany({
      where: {
        userId,
        ...(active !== undefined && { isActive: active }),
      },
      include: {
        workoutDays: {
          include: {
            workoutExercises: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIdWithDaysAndExercises(
    id: string,
  ): Promise<WorkoutPlanWithDaysExercisesAndCount | null> {
    return prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        workoutDays: {
          include: {
            workoutExercises: true,
            _count: {
              select: { workoutExercises: true },
            },
          },
        },
      },
    });
  }

  async findByIdWithDay(
    id: string,
    dayId: string,
  ): Promise<WorkoutPlanWithFilteredDay | null> {
    return prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        workoutDays: {
          where: { id: dayId },
          include: { workoutSessions: true },
        },
      },
    });
  }

  async createWorkoutPlan(
    input: CreateWorkoutPlanInput,
  ): Promise<WorkoutPlanWithDaysAndExercises | null> {
    return prisma.$transaction(async (tx) => {
      const existingPlan = await tx.workoutPlan.findFirst({
        where: { userId: input.userId, isActive: true },
      });

      if (existingPlan) {
        await tx.workoutPlan.update({
          where: { id: existingPlan.id },
          data: { isActive: false },
        });
      }

      const workoutPlan = await tx.workoutPlan.create({
        data: {
          name: input.name,
          userId: input.userId,
          isActive: true,
          estimateDurationInSeconds: input.estimateDurationInSeconds,
          workoutDays: {
            create: input.workoutDays.map((workDay) => ({
              name: workDay.name,
              isRestDay: workDay.isRestDay,
              weekDay: workDay.weekDay,
              coverImageUrl: workDay.coverImageUrl,
              workoutExercises: {
                create: workDay.exercises.map((exercise) => ({
                  name: exercise.name,
                  order: exercise.order,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restTimeInSeconds: exercise.restTimeInSeconds,
                })),
              },
            })),
          },
        },
      });

      return tx.workoutPlan.findUnique({
        where: { id: workoutPlan.id },
        include: {
          workoutDays: {
            include: {
              workoutExercises: true,
            },
          },
        },
      });
    });
  }
}
