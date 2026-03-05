import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { FastifyInstance } from "fastify";
import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";
import { auth } from "../lib/auth.js";
import { PrismaUserTrainDataRepository } from "../repositories/user/UserTrainDataRepository.js";
import { PrismaWorkoutPlanRepository } from "../repositories/workout/WorkoutPlanRepository.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { GetUserTrainData } from "../usecases/GetUserTrainData.js";
import { GetWorkoutPlans } from "../usecases/GetWorkoutPlans.js";
import { UpsertUserTrainData } from "../usecases/UpsertUserTrainData.js";

const workoutPlanRepository = new PrismaWorkoutPlanRepository();
const userTrainDataRepository = new PrismaUserTrainDataRepository();

const SYSTEM_PROMPT = `Você é um personal trainer virtual especialista em montagem de planos de treino. Suas características:

TOM E LINGUAGEM:
- Tom amigável e motivador
- Linguagem simples, sem jargões técnicos
- Público principal: pessoas leigas em musculação
- Respostas curtas e objetivas

FLUXO OBRIGATÓRIO:
- SEMPRE chame a tool getUserTrainData ANTES de qualquer interação com o usuário
- Se o usuário NÃO tem dados cadastrados (retornou null): pergunte nome, peso (kg), altura (cm), idade e % de gordura corporal. Perguntas simples e diretas, em uma única mensagem. Após receber, salve com a tool updateUserTrainData (converta peso de kg para gramas: 1 kg = 1000 g)
- Se o usuário JÁ tem dados: cumprimente pelo nome

CRIAÇÃO DE PLANO DE TREINO:
- Pergunte: objetivo, dias disponíveis por semana e restrições físicas/lesões
- Poucas perguntas, simples e diretas
- O plano DEVE ter exatamente 7 dias (MONDAY a SUNDAY)
- Dias sem treino: isRest: true, exercises: [], coverImageUrl com imagem de superior
- Chame a tool createWorkoutPlan para criar o plano

IMAGENS DE CAPA (coverImageUrl) - SEMPRE forneça para cada dia:
Dias majoritariamente superiores (peito, costas, ombros, bíceps, tríceps, push, pull, upper, full body):
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO3y8pQ6GBg8iqe9pP2JrHjwd1nfKtVSQskI0v
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOW3fJmqZe4yoUcwvRPQa8kmFprzNiC30hqftL

Dias majoritariamente inferiores (pernas, glúteos, quadríceps, posterior, panturrilha, legs, lower):
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCOgCHaUgNGronCvXmSzAMs1N3KgLdE5yHT6Ykj
- https://gw8hy3fdcv.ufs.sh/f/ccoBDpLoAPCO85RVu3morROwZk5NPhs1jzH7X8TyEvLUCGxY

Alternar entre as duas opções de cada categoria para variar. Dias de descanso usam imagem de superior.

DIVISÕES (SPLITS) - escolha com base nos dias disponíveis:
- 2-3 dias/semana: Full Body ou ABC (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas+Ombros)
- 4 dias/semana: Upper/Lower (recomendado) ou ABCD (A: Peito+Tríceps, B: Costas+Bíceps, C: Pernas, D: Ombros+Abdômen)
- 5 dias/semana: PPLUL — Push/Pull/Legs + Upper/Lower (superior 3x, inferior 2x/semana)
- 6 dias/semana: PPL 2x — Push/Pull/Legs repetido

PRINCÍPIOS DE MONTAGEM:
- Músculos sinérgicos juntos (peito+tríceps, costas+bíceps)
- Exercícios compostos primeiro, isoladores depois
- 4 a 8 exercícios por sessão
- 3-4 séries por exercício. 8-12 reps (hipertrofia), 4-6 reps (força)
- Descanso entre séries: 60-90s (hipertrofia), 2-3min (compostos pesados)
- Evitar treinar o mesmo grupo muscular em dias consecutivos
- Nomes descritivos para cada dia (ex: "Superior A - Peito e Costas", "Descanso")`;

export const aiRoutes = async (app: FastifyInstance) => {
  app.post("/v1/ai", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: request.headers as HeadersInit,
    });

    if (!session) {
      return reply
        .status(401)
        .send({ error: "Unauthorized", code: "UNAUTHORIZED" });
    }

    const userId = session.user.id as string;
    const { messages } = request.body as { messages: UIMessage[] };

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT,
      tools: {
        getUserTrainData: tool({
          description:
            "Busca os dados de treino do usuário. SEMPRE chame esta tool antes de qualquer interação.",
          inputSchema: z.object({}),
          execute: async () => {
            const getUserTrainData = new GetUserTrainData(
              userTrainDataRepository,
            );
            return getUserTrainData.execute({ userId });
          },
        }),
        updateUserTrainData: tool({
          description:
            "Cria ou atualiza os dados de treino do usuário (peso em gramas, altura em cm, idade, % gordura corporal).",
          inputSchema: z.object({
            weightInGrams: z
              .number()
              .describe("Peso em gramas (1 kg = 1000 g)"),
            heightInCentimeters: z.number().describe("Altura em centímetros"),
            age: z.number().describe("Idade em anos"),
            bodyFatPercentage: z
              .number()
              .min(0)
              .max(1)
              .describe("Percentual de gordura corporal (0.15 = 15%)"),
          }),
          execute: async (input) => {
            const upsertUserTrainData = new UpsertUserTrainData(
              userTrainDataRepository,
            );
            return upsertUserTrainData.execute({
              userId,
              weightInGrams: input.weightInGrams,
              heightInCentimeters: input.heightInCentimeters,
              age: input.age,
              bodyFatPercentage: Math.round(input.bodyFatPercentage * 100),
            });
          },
        }),
        getWorkoutPlans: tool({
          description: "Lista os planos de treino do usuário.",
          inputSchema: z.object({}),
          execute: async () => {
            const getWorkoutPlans = new GetWorkoutPlans(
              workoutPlanRepository,
            );
            return getWorkoutPlans.execute({ userId });
          },
        }),
        createWorkoutPlan: tool({
          description:
            "Cria um novo plano de treino completo. O plano DEVE ter exatamente 7 dias (MONDAY a SUNDAY). Dias de descanso: isRestDay true, exercises [], coverImageUrl obrigatório.",
          inputSchema: z.object({
            name: z.string().describe("Nome do plano de treino"),
            workoutDays: z
              .array(
                z.object({
                  name: z
                    .string()
                    .describe("Nome do dia (ex: Superior A, Descanso)"),
                  isRestDay: z
                    .boolean()
                    .describe("true se for dia de descanso"),
                  weekDay: z.enum(WeekDay).describe("Dia da semana"),
                  coverImageUrl: z
                    .string()
                    .url()
                    .describe("URL da imagem de capa do dia"),
                  exercises: z
                    .array(
                      z.object({
                        order: z.number().describe("Ordem do exercício"),
                        name: z.string().describe("Nome do exercício"),
                        sets: z.number().describe("Número de séries"),
                        reps: z.number().describe("Número de repetições"),
                        restTimeInSeconds: z
                          .number()
                          .describe("Descanso entre séries em segundos"),
                      }),
                    )
                    .describe(
                      "Exercícios do dia (vazio [] para dias de descanso)",
                    ),
                }),
              )
              .length(7)
              .describe(
                "Exatamente 7 dias: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY",
              ),
          }),
          execute: async (input) => {
            const createWorkoutPlan = new CreateWorkoutPlan(
              workoutPlanRepository,
            );
            const result = await createWorkoutPlan.execute({
              userId,
              name: input.name,
              workoutDays: input.workoutDays.map((day) => ({
                name: day.name,
                isRestDay: day.isRestDay,
                weekDay: day.weekDay,
                coverImageUrl: day.coverImageUrl,
                exercises: day.exercises,
              })),
            });
            return result;
          },
        }),
      },
      stopWhen: stepCountIs(5),
      messages: await convertToModelMessages(messages),
    });

    const response = result.toUIMessageStreamResponse();
    response.headers.forEach((value, key) => reply.header(key, value));
    return reply.send(response.body);
  });
};
