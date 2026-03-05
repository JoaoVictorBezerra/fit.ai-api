import {
  WorkoutDay,
  WorkoutPlan,
  WorkoutSession,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/db.js";

export type WorkoutSessionWithDayAndPlan = WorkoutSession & {
  workoutDay: WorkoutDay & { workoutPlan: WorkoutPlan };
};

export type WorkoutSessionWithDay = WorkoutSession & {
  workoutDay: WorkoutDay;
};

export interface IWorkoutSessionRepository {
  findWorkoutSessionById(
    id: string,
  ): Promise<WorkoutSessionWithDayAndPlan | null>;
  completeWorkoutSession(
    userWorkoutSessionId: string,
  ): Promise<WorkoutSession>;
  createSession(workoutDayId: string): Promise<WorkoutSession>;
  findByUserInDateRange(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<WorkoutSessionWithDay[]>;
  findCompletedByDayInDateRange(
    workoutDayId: string,
    from: Date,
    to: Date,
  ): Promise<WorkoutSession | null>;
}

export class PrismaWorkoutSessionRepository
  implements IWorkoutSessionRepository
{
  async findWorkoutSessionById(
    id: string,
  ): Promise<WorkoutSessionWithDayAndPlan | null> {
    return prisma.workoutSession.findUnique({
      where: { id },
      include: {
        workoutDay: {
          include: {
            workoutPlan: true,
          },
        },
      },
    });
  }

  async completeWorkoutSession(
    userWorkoutSessionId: string,
  ): Promise<WorkoutSession> {
    return prisma.workoutSession.update({
      where: { id: userWorkoutSessionId },
      data: { completedAt: new Date() },
    });
  }

  async createSession(workoutDayId: string): Promise<WorkoutSession> {
    return prisma.workoutSession.create({
      data: {
        workoutDayId,
        startedAt: new Date(),
      },
    });
  }

  async findByUserInDateRange(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<WorkoutSessionWithDay[]> {
    return prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId,
          },
        },
        startedAt: {
          gte: from,
          lte: to,
        },
      },
      include: {
        workoutDay: true,
      },
    });
  }

  async findCompletedByDayInDateRange(
    workoutDayId: string,
    from: Date,
    to: Date,
  ): Promise<WorkoutSession | null> {
    return prisma.workoutSession.findFirst({
      where: {
        workoutDayId,
        completedAt: { not: null },
        startedAt: { gte: from, lte: to },
      },
    });
  }
}
