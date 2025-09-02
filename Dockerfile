# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Install TypeScript + ts-node globally
RUN npm install -g ts-node typescript

# Copy the rest of the code
COPY tsconfig.json ./
COPY src ./src

# Expose service port
EXPOSE 8080

# Force ts-node to run instead of node
ENTRYPOINT ["npx", "ts-node", "--esm"]
CMD ["src/index.ts"]
