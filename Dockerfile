FROM node:20 AS builder

ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET

WORKDIR /app

COPY package*.json ./
RUN npm install --frozen-lockfile

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

COPY . .

RUN npm run build

FROM node:20-slim

RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
