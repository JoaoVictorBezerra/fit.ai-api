import { WeekDay } from "../generated/prisma/client.js";
import { prisma } from "../lib/db.js";

interface CreateWorkoutPlanDTO {
  userId: string;
  name: string;
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

export class CreateWorkoutPlan {
  async execute(dto: CreateWorkoutPlanDTO) {
    const existingWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: { userId: dto.userId, isActive: true },
    });

    return prisma.$transaction(async (tx) => {
      if (existingWorkoutPlan) {
        await tx.workoutPlan.update({
          where: { id: existingWorkoutPlan.id },
          data: { isActive: false },
        });
      }

      const workoutPlan = await tx.workoutPlan.create({
        data: {
          name: dto.name,
          userId: dto.userId,
          isActive: true,
          estimateDurationInSeconds: dto.workoutDays.reduce((acc, workDay) => {
            return (
              acc +
              workDay.exercises.reduce((acc, exercise) => {
                return acc + exercise.restTimeInSeconds;
              }, 0)
            );
          }, 0),
          workoutDays: {
            create: dto.workoutDays.map((workDay) => {
              return {
                name: workDay.name,
                isRestDay: workDay.isRestDay,
                weekDay: workDay.weekDay,
                coverImageUrl: workDay.coverImageUrl,
                workoutExercises: {
                  create: workDay.exercises.map((exercise) => {
                    return {
                      name: exercise.name,
                      order: exercise.order,
                      sets: exercise.sets,
                      reps: exercise.reps,
                      restTimeInSeconds: exercise.restTimeInSeconds,
                    };
                  }),
                },
              };
            }),
          },
        },
      });

      const result = await tx.workoutPlan.findUnique({
        where: { id: workoutPlan.id },
        include: {
          workoutDays: {
            include: {
              workoutExercises: true,
            },
          },
        },
      });

      return result;
    });
  }
}
