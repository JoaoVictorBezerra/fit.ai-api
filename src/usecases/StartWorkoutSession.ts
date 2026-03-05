import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";
import { IWorkoutPlanRepository } from "../repositories/workout/WorkoutPlanRepository.js";
import { IWorkoutSessionRepository } from "../repositories/workout/WorkoutSessionRepository.js";

interface InputDto {
  userId: string;
  planId: string;
  dayId: string;
}

interface OutputDto {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
    private readonly workoutSessionRepository: IWorkoutSessionRepository,
  ) {}

  async execute(dto: InputDto): Promise<OutputDto> {
    const plan = await this.workoutPlanRepository.findByIdWithDay(
      dto.planId,
      dto.dayId,
    );

    if (!plan) throw new NotFoundError("Workout plan not found");

    const day = plan.workoutDays[0];
    if (!day) throw new NotFoundError("Workout day not found");

    if (plan.userId !== dto.userId)
      throw new ForbiddenError(
        "Only the workout plan owner can start a session",
      );

    if (day.workoutSessions.length > 0)
      throw new ConflictError("Workout day already has a session started");

    const session = await this.workoutSessionRepository.createSession(
      dto.dayId,
    );

    return { userWorkoutSessionId: session.id };
  }
}
