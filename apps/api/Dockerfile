# Multi-stage Dockerfile for pnpm monorepo
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 1: Build
FROM base AS build
WORKDIR /usr/src/app

# Copy lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy shared package
COPY packages/shared ./packages/shared
# Copy API package
COPY apps/api ./apps/api

# Install all dependencies (required for building)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @steadycut/shared build
# Build API package
RUN pnpm --filter @steadycut/api build

# Prune dev dependencies
RUN pnpm install --prod --frozen-lockfile

# Stage 2: Runtime
FROM base AS runtime
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy node_modules from build stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /usr/src/app/packages/shared ./packages/shared
COPY --from=build /usr/src/app/apps/api ./apps/api

# Ensure Prisma Client is generated for the runtime environment
WORKDIR /usr/src/app/apps/api
RUN pnpm prisma generate

# Expose port for Cloud Run
EXPOSE 8080

# Start the application
CMD [ "node", "dist/index.js" ]
