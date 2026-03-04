import { ForbiddenError, NotFoundError } from "../errors/index.js";
import { WorkoutSession } from "../generated/prisma/client.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userWorkoutSessionId: string;
  userId: string;
}

interface OutputDto {
  userWorkoutSession: WorkoutSession;
}

export class CompleteWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutSession = await prisma.workoutSession.findUnique({
      where: { id: dto.userWorkoutSessionId },
      include: {
        workoutDay: {
          include: {
            workoutPlan: true,
          },
        },
      },
    });

    if (!workoutSession) throw new NotFoundError("Workout session not found");

    if (workoutSession.workoutDay.workoutPlan.userId !== dto.userId)
      throw new ForbiddenError(
        "Only the workout plan owner can complete a session",
      );

    const updatedWorkoutSession = await prisma.workoutSession.update({
      where: { id: dto.userWorkoutSessionId },
      data: { completedAt: new Date() },
    });

    return { userWorkoutSession: updatedWorkoutSession };
  }
}
