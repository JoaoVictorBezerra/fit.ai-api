import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  planId: string;
}

interface OutputDto {
  id: string;
  name: string;
  workoutDays: Array<{
    id: string;
    weekDay: string;
    name: string;
    isRest: boolean;
    estimatedDurationInSeconds: number;
    exercisesCount: number;
  }>;
}

export class GetWorkoutPlanById {
  async execute(dto: InputDto): Promise<OutputDto> {
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: dto.planId },
      include: {
        workoutDays: {
          include: {
            workoutExercises: true,
            _count: {
              select: {
                workoutExercises: true,
              },
            },
          },
        },
      },
    });

    if (!plan || plan.userId !== dto.userId)
      throw new NotFoundError("Workout plan not found");

    return {
      id: plan.id,
      name: plan.name,
      workoutDays: plan.workoutDays.map((day) => ({
        id: day.id,
        weekDay: day.weekDay,
        name: day.name,
        isRest: day.isRestDay,
        estimatedDurationInSeconds: day.workoutExercises.reduce(
          (acc, ex) => acc + ex.restTimeInSeconds,
          0,
        ),
        exercisesCount: day._count.workoutExercises,
      })),
    };
  }
}
