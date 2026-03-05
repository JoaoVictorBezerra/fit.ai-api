import { ForbiddenError, NotFoundError } from "../errors/index.js";
import { WorkoutSession } from "../generated/prisma/client.js";
import { IWorkoutSessionRepository } from "../repositories/workout/WorkoutSessionRepository.js";

interface InputDto {
  userWorkoutSessionId: string;
  userId: string;
}

interface OutputDto {
  userWorkoutSession: WorkoutSession;
}

export class CompleteWorkoutSession {
  constructor(
    private readonly workoutSessionRepository: IWorkoutSessionRepository,
  ) {}

  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutSession =
      await this.workoutSessionRepository.findWorkoutSessionById(
        dto.userWorkoutSessionId,
      );

    if (!workoutSession) throw new NotFoundError("Workout session not found");

    if (workoutSession.workoutDay.workoutPlan.userId !== dto.userId)
      throw new ForbiddenError(
        "Only the workout plan owner can complete a session",
      );

    const updatedWorkoutSession =
      await this.workoutSessionRepository.completeWorkoutSession(
        dto.userWorkoutSessionId,
      );

    return { userWorkoutSession: updatedWorkoutSession };
  }
}
