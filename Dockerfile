# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests first (for caching npm install layer)
COPY package*.json ./

# Install dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the rest of the application
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript into JavaScript
RUN npx tsc

# Expose service port (adjust if not 3000)
EXPOSE 3000

# Start the app
CMD ["node", "dist/index.js"]
