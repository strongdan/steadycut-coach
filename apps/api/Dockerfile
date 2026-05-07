# Multi-stage Dockerfile for the pnpm monorepo API service.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /usr/src/app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# The repo does not currently commit a pnpm lockfile. Prefer committing one later
# and switching this back to --frozen-lockfile for reproducible production builds.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

RUN pnpm --filter @steadycut/shared build
RUN pnpm --filter @steadycut/api prisma:generate
RUN pnpm --filter @steadycut/api build

FROM base AS prod-deps
WORKDIR /usr/src/app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --no-frozen-lockfile

FROM base AS runtime
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /usr/src/app/packages/shared ./packages/shared
COPY --from=build /usr/src/app/apps/api ./apps/api

WORKDIR /usr/src/app/apps/api
EXPOSE 8080
CMD [ "node", "dist/index.js" ]
