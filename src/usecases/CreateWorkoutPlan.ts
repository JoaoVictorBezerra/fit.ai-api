import { WeekDay } from "../generated/prisma/client.js";
import { IWorkoutPlanRepository } from "../repositories/workout/WorkoutPlanRepository.js";

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
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
  ) {}

  async execute(dto: CreateWorkoutPlanDTO) {
    const estimateDurationInSeconds = dto.workoutDays.reduce(
      (acc, workDay) =>
        acc +
        workDay.exercises.reduce(
          (acc, exercise) => acc + exercise.restTimeInSeconds,
          0,
        ),
      0,
    );

    return this.workoutPlanRepository.createWorkoutPlan({
      userId: dto.userId,
      name: dto.name,
      estimateDurationInSeconds,
      workoutDays: dto.workoutDays,
    });
  }
}
