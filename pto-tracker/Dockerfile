# Build stage
FROM node:23.6-alpine3.20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --force
COPY . .
RUN npm run build

# Production stage
FROM node:23.6-alpine3.20 AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
