# Render-ready Dockerfile (optional). You can also use Render's native Node builder.
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
RUN     if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile;     elif [ -f package-lock.json ]; then npm ci;     elif [ -f yarn.lock ]; then corepack enable && yarn install --immutable;     else npm i; fi

COPY tsconfig.json ./
COPY src ./src
RUN npm run build || pnpm build || yarn build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
