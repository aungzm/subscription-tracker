FROM node:20 AS builder

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Set the working directory inside the container
WORKDIR /app
COPY package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build

# Use a lighter image for production
FROM node:20-slim

# Set the working directory
WORKDIR /app
# Copy the built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

# Expose the port your Next.js app runs on (default is 3000)
EXPOSE 3000
CMD ["npm", "start"]
