import {
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSession,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/db.js";

export type WorkoutDayWithPlanExercisesAndSessions = WorkoutDay & {
  workoutPlan: WorkoutPlan;
  workoutExercises: WorkoutExercise[];
  workoutSessions: WorkoutSession[];
};

export interface IWorkoutDayRepository {
  findByIdAndPlanId(
    dayId: string,
    planId: string,
  ): Promise<WorkoutDayWithPlanExercisesAndSessions | null>;
}

export class PrismaWorkoutDayRepository implements IWorkoutDayRepository {
  async findByIdAndPlanId(
    dayId: string,
    planId: string,
  ): Promise<WorkoutDayWithPlanExercisesAndSessions | null> {
    return prisma.workoutDay.findFirst({
      where: {
        id: dayId,
        workoutPlanId: planId,
      },
      include: {
        workoutPlan: true,
        workoutExercises: true,
        workoutSessions: true,
      },
    });
  }
}
