# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies (including devDependencies)
RUN npm install

# Install ts-node and typescript globally to run TypeScript directly
RUN npm install -g ts-node typescript

# Copy the rest of the source code
COPY tsconfig.json ./
COPY src ./src

# Expose the port your aggregator uses
EXPOSE 8080

# Run the aggregator directly with ts-node (no compilation)
CMD ["npx", "ts-node", "src/index.ts"]
