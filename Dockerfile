FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN npm ci --omit=dev
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/frontend/dist packages/frontend/dist
COPY --from=builder /app/packages/backend/dist packages/backend/dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "packages/backend/dist/index.js"]
