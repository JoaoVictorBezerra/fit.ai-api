FROM node:24-slim as builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma


# Dependencias
FROM builder as dependencies

RUN pnpm install --frozen-lockfile

# Build
from dependencies AS build

COPY . .

RUN pnpm run build && cp -r src/generated dist/generated

# Produção
FROM builder AS production

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/dist /app/dist

CMD ["node", "dist/src/index.js"]