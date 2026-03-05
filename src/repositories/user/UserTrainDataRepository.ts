import { UserTrainData } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/db.js";

export type UserTrainDataWithUser = UserTrainData & {
  user: { name: string };
};

export interface UpsertUserTrainDataInput {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

export interface IUserTrainDataRepository {
  findByUserId(userId: string): Promise<UserTrainDataWithUser | null>;
  upsert(data: UpsertUserTrainDataInput): Promise<UserTrainData>;
}

export class PrismaUserTrainDataRepository
  implements IUserTrainDataRepository
{
  async findByUserId(userId: string): Promise<UserTrainDataWithUser | null> {
    return prisma.userTrainData.findUnique({
      where: { userId },
      include: { user: true },
    });
  }

  async upsert(data: UpsertUserTrainDataInput): Promise<UserTrainData> {
    return prisma.userTrainData.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        weightInGrams: data.weightInGrams,
        heightInCentimeters: data.heightInCentimeters,
        age: data.age,
        bodyFatPercentage: data.bodyFatPercentage,
      },
      update: {
        weightInGrams: data.weightInGrams,
        heightInCentimeters: data.heightInCentimeters,
        age: data.age,
        bodyFatPercentage: data.bodyFatPercentage,
      },
    });
  }
}
