import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { $Enums } from "../generated/prisma/client.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { IWorkoutPlanRepository } from "../repositories/workout/WorkoutPlanRepository.js";
import { IWorkoutSessionRepository } from "../repositories/workout/WorkoutSessionRepository.js";

dayjs.extend(utc);

function parseUtcDate(dateStr: string): dayjs.Dayjs {
  return dayjs.utc(dateStr);
}

const WEEKDAY_ORDER: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const DAY_INDEX_TO_WEEKDAY = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
] as const;

interface InputDto {
  userId: string;
  date: string;
}

interface OutputDto {
  activeWorkoutPlanid: string;
  todayWorkoutDay: {
    id: string;
    name: string;
    isRest: boolean;
    weekDay: $Enums.WeekDay;
    estimatedDurationInSeconds: string;
    exercisesCount: number;
  } | null;
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    { workoutDayCompleted: boolean; workoutDayStarted: boolean }
  >;
}

export class GetHomeData {
  constructor(
    private readonly workoutPlanRepository: IWorkoutPlanRepository,
    private readonly workoutSessionRepository: IWorkoutSessionRepository,
  ) {}

  async execute(dto: InputDto): Promise<OutputDto> {
    const date = parseUtcDate(dto.date);
    const weekStart = date.startOf("week");
    const weekEnd = date.endOf("week");

    const weekStartDate = weekStart.toDate();
    const weekEndDate = weekEnd.toDate();

    const activeWorkoutPlan =
      await this.workoutPlanRepository.findActiveByUserIdWithDaysAndSessions(
        dto.userId,
      );

    let activeWorkoutPlanid = "";
    let todayWorkoutDay: OutputDto["todayWorkoutDay"] = null;

    if (activeWorkoutPlan) {
      activeWorkoutPlanid = activeWorkoutPlan.id;

      const dateWeekDay = DAY_INDEX_TO_WEEKDAY[date.day()];
      const matchingDay = activeWorkoutPlan.workoutDays.find(
        (d) => d.weekDay === dateWeekDay,
      );

      if (matchingDay) {
        const duration = matchingDay.workoutExercises.reduce(
          (acc, ex) => acc + ex.restTimeInSeconds,
          0,
        );
        todayWorkoutDay = {
          id: matchingDay.id,
          name: matchingDay.name,
          isRest: matchingDay.isRestDay,
          weekDay: matchingDay.weekDay,
          estimatedDurationInSeconds: String(duration),
          exercisesCount: matchingDay.workoutExercises.length,
        };
      }
    }

    const workoutSessions =
      await this.workoutSessionRepository.findByUserInDateRange(
        dto.userId,
        weekStartDate,
        weekEndDate,
      );

    const consistencyByDay: OutputDto["consistencyByDay"] = {};
    let current = weekStart;
    while (current.isBefore(weekEnd) || current.isSame(weekEnd, "day")) {
      const key = current.format("YYYY-MM-DD");
      consistencyByDay[key] = {
        workoutDayCompleted: false,
        workoutDayStarted: false,
      };
      current = current.add(1, "day");
    }

    for (const session of workoutSessions) {
      const dateKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
      if (consistencyByDay[dateKey]) {
        consistencyByDay[dateKey].workoutDayStarted = true;
        if (session.completedAt) {
          consistencyByDay[dateKey].workoutDayCompleted = true;
        }
      }
    }

    const workoutStreak = await this.calculateWorkoutStreak(
      dto.userId,
      date,
      activeWorkoutPlan,
    );

    return {
      activeWorkoutPlanid,
      todayWorkoutDay,
      workoutStreak,
      consistencyByDay,
    };
  }

  private async calculateWorkoutStreak(
    _userId: string,
    fromDate: dayjs.Dayjs,
    activeWorkoutPlan: {
      workoutDays: Array<{ id: string; weekDay: string }>;
    } | null,
  ): Promise<number> {
    if (!activeWorkoutPlan) return 0;

    const planDays = [...activeWorkoutPlan.workoutDays].sort(
      (a, b) => WEEKDAY_ORDER[a.weekDay] - WEEKDAY_ORDER[b.weekDay],
    );
    if (planDays.length === 0) return 0;

    const planWeekDays = new Set(planDays.map((d) => d.weekDay));
    let streak = 0;
    let currentDate = fromDate;

    while (true) {
      const weekDay = DAY_INDEX_TO_WEEKDAY[currentDate.day()];
      if (!planWeekDays.has(weekDay)) break;

      const dayStart = currentDate.startOf("day").utc().toDate();
      const dayEnd = currentDate.endOf("day").utc().toDate();

      const matchingPlanDay = planDays.find((d) => d.weekDay === weekDay);
      if (!matchingPlanDay) break;

      const completedSession =
        await this.workoutSessionRepository.findCompletedByDayInDateRange(
          matchingPlanDay.id,
          dayStart,
          dayEnd,
        );

      if (!completedSession) break;

      streak++;
      currentDate = currentDate.subtract(1, "day");
    }

    return streak;
  }
}
