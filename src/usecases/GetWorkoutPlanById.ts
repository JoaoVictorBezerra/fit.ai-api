import { NotFoundError } from "../errors/index.js";
import { IWorkoutPlanRepository } from "../repositories/workout/WorkoutPlanRepository.js";

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
    coverImageUrl: string | null;
  }>;
}

export class GetWorkoutPlanById {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
  ) {}

  async execute(dto: InputDto): Promise<OutputDto> {
    const plan = await this.workoutPlanRepository.findByIdWithDaysAndExercises(
      dto.planId,
    );

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
        coverImageUrl: day.coverImageUrl,
      })),
    };
  }
}
