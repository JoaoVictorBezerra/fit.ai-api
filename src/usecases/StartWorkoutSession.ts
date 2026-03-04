import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  planId: string;
  dayId: string;
}

interface OutputDto {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: dto.planId },
      include: {
        workoutDays: {
          where: { id: dto.dayId },
          include: { workoutSessions: true },
        },
      },
    });

    if (!plan) throw new NotFoundError("Workout plan not found");

    const day = plan.workoutDays[0];
    if (!day) throw new NotFoundError("Workout day not found");

    if (plan.userId !== dto.userId)
      throw new ForbiddenError(
        "Only the workout plan owner can start a session",
      );

    if (day.workoutSessions.length > 0)
      throw new ConflictError("Workout day already has a session started");

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: dto.dayId,
        startedAt: new Date(),
      },
    });

    return { userWorkoutSessionId: session.id };
  }
}
