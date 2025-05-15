# Use a Node.js base image for building
FROM node:20 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and lock files (yarn.lock or package-lock.json)
COPY package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of your application code
COPY . .

# Build the Next.js application
RUN npm run build

# Use a light image for production
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
