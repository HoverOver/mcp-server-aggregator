# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the rest of the code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript into JavaScript
RUN tsc

# Expose service port
EXPOSE 8080

# Run the compiled JavaScript instead of TypeScript
CMD ["node", "dist/index.js"]
