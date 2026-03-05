import dayjs from "dayjs";

import { ForbiddenError, NotFoundError } from "../errors/index.js";
import { IWorkoutDayRepository } from "../repositories/workout/WorkoutDayRepository.js";

interface InputDto {
  userId: string;
  planId: string;
  dayId: string;
}

interface OutputDto {
  id: string;
  name: string;
  isRest: boolean;
  estimatedDurationInSeconds: number;
  exercises: Array<{
    id: string;
    name: string;
    order: number;
    workoutDayId: string;
    sets: number;
    reps: number;
    restTimeInSeconds: number;
  }>;
  weekDay: string;
  sessions: Array<{
    id: string;
    workoutDayId: string;
    startedAt?: string;
    completedAt?: string;
  }>;
}

export class GetWorkoutDayById {
  constructor(
    private readonly workoutDayRepository: IWorkoutDayRepository,
  ) {}

  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutDay = await this.workoutDayRepository.findByIdAndPlanId(
      dto.dayId,
      dto.planId,
    );

    if (!workoutDay) throw new NotFoundError("Workout day not found");

    if (workoutDay.workoutPlan.userId !== dto.userId)
      throw new ForbiddenError(
        "Only the workout plan owner can view this workout day",
      );

    const estimatedDurationInSeconds = workoutDay.workoutExercises.reduce(
      (acc, ex) => acc + ex.restTimeInSeconds,
      0,
    );

    return {
      id: workoutDay.id,
      name: workoutDay.name,
      isRest: workoutDay.isRestDay,
      estimatedDurationInSeconds,
      exercises: workoutDay.workoutExercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        order: ex.order,
        workoutDayId: ex.workoutDayId,
        sets: ex.sets,
        reps: ex.reps,
        restTimeInSeconds: ex.restTimeInSeconds,
      })),
      weekDay: workoutDay.weekDay,
      sessions: workoutDay.workoutSessions.map((session) => ({
        id: session.id,
        workoutDayId: session.workoutDayId,
        startedAt: dayjs(session.startedAt).format("YYYY-MM-DD"),
        completedAt: session.completedAt
          ? dayjs(session.completedAt).format("YYYY-MM-DD")
          : undefined,
      })),
    };
  }
}
