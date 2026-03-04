import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  active?: boolean;
}

interface OutputDto {
    workoutPlans: Array<{
      id: string;
      name: string;
      userId: string;
      isActive: boolean;
      estimateDurationInSeconds: number;
      createdAt: Date;
      updatedAt: Date;
      workoutDays: Array<{
        id: string;
        name: string;
        workoutPlanId: string;
        isRestDay: boolean;
        weekDay: string;
        coverImageUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
      workoutExercises: Array<{
        id: string;
        name: string;
        order: number;
        workoutDayId: string;
        sets: number;
        reps: number;
        restTimeInSeconds: number;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }>;
  }>;
}

export class GetWorkoutPlans {
  async execute(dto: InputDto): Promise<OutputDto> {
    const plans = await prisma.workoutPlan.findMany({
      where: {
        userId: dto.userId,
        ...(dto.active !== undefined && { isActive: dto.active }),
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

    return {
      workoutPlans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        userId: plan.userId,
        isActive: plan.isActive,
        estimateDurationInSeconds: plan.estimateDurationInSeconds,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        workoutDays: plan.workoutDays.map((day) => ({
          id: day.id,
          name: day.name,
          workoutPlanId: day.workoutPlanId,
          isRestDay: day.isRestDay,
          weekDay: day.weekDay,
          coverImageUrl: day.coverImageUrl,
          createdAt: day.createdAt,
          updatedAt: day.updatedAt,
          workoutExercises: day.workoutExercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            order: ex.order,
            workoutDayId: ex.workoutDayId,
            sets: ex.sets,
            reps: ex.reps,
            restTimeInSeconds: ex.restTimeInSeconds,
            createdAt: ex.createdAt,
            updatedAt: ex.updatedAt,
          })),
        })),
      })),
    };
  }
}
