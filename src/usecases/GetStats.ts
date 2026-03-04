import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

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
  from: string;
  to: string;
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    { workoutDayCompleted: boolean; workoutDayStarted: boolean }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const fromDate = dayjs.utc(dto.from).startOf("day").toDate();
    const toDate = dayjs.utc(dto.to).endOf("day").toDate();

    const workoutSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        workoutDay: true,
      },
    });

    const consistencyByDay: OutputDto["consistencyByDay"] = {};

    for (const session of workoutSessions) {
      const dateKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
      if (!consistencyByDay[dateKey]) {
        consistencyByDay[dateKey] = {
          workoutDayCompleted: false,
          workoutDayStarted: false,
        };
      }
      consistencyByDay[dateKey].workoutDayStarted = true;
      if (session.completedAt) {
        consistencyByDay[dateKey].workoutDayCompleted = true;
      }
    }

    const completedWorkoutsCount = workoutSessions.filter(
      (s) => s.completedAt != null,
    ).length;

    const totalSessions = workoutSessions.length;
    const conclusionRate =
      totalSessions > 0 ? completedWorkoutsCount / totalSessions : 0;

    const totalTimeInSeconds = workoutSessions
      .filter((s) => s.completedAt != null)
      .reduce((acc, s) => {
        const duration =
          (s.completedAt!.getTime() - s.startedAt.getTime()) / 1000;
        return acc + Math.round(duration);
      }, 0);

    const workoutStreak = await this.calculateWorkoutStreak(
      dto.userId,
      dayjs.utc(dto.to),
    );

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }

  private async calculateWorkoutStreak(
    userId: string,
    fromDate: dayjs.Dayjs,
  ): Promise<number> {
    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: { workoutDays: true },
    });

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

      const completedSession = await prisma.workoutSession.findFirst({
        where: {
          workoutDayId: matchingPlanDay.id,
          completedAt: { not: null },
          startedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      if (!completedSession) break;

      streak++;
      currentDate = currentDate.subtract(1, "day");
    }

    return streak;
  }
}
