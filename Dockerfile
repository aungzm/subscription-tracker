FROM node:20 AS builder

ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG VERCEL_URL

WORKDIR /app

COPY package*.json ./
RUN npm install --frozen-lockfile

# Make ARGs available as ENV for the build process
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV VERCEL_URL=${VERCEL_URL} # Consider if this is truly needed

COPY . .

RUN npm run build

# Final runtime image
FROM node:20-slim

# Install OpenSSL (for Prisma) and clean up
RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma # Good for schema, migrations

EXPOSE 3000
CMD ["npm", "start"]
