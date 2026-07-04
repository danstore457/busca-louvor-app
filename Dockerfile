# Use an official Node.js runtime as a parent image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application (Vite build + server bundling)
RUN npm run build

# --- Production Image ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Render and other providers will override this PORT env var if needed
ENV PORT=3000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
