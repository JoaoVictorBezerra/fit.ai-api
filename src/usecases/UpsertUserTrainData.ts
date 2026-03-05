import { IUserTrainDataRepository } from "../repositories/user/UserTrainDataRepository.js";

interface InputDto {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

interface OutputDto {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

export class UpsertUserTrainData {
  constructor(
    private readonly userTrainDataRepository: IUserTrainDataRepository,
  ) {}

  async execute(dto: InputDto): Promise<OutputDto> {
    const trainData = await this.userTrainDataRepository.upsert({
      userId: dto.userId,
      weightInGrams: dto.weightInGrams,
      heightInCentimeters: dto.heightInCentimeters,
      age: dto.age,
      bodyFatPercentage: dto.bodyFatPercentage,
    });

    return {
      userId: trainData.userId,
      weightInGrams: trainData.weightInGrams,
      heightInCentimeters: trainData.heightInCentimeters,
      age: trainData.age,
      bodyFatPercentage: trainData.bodyFatPercentage,
    };
  }
}
