# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies (including devDependencies for TypeScript types)
RUN npm install

# Install missing type definitions needed for TypeScript build
RUN npm install --save-dev @types/express @types/cors @types/node

# Copy the rest of the source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript (skip library type checks to avoid errors)
RUN npx tsc --skipLibCheck

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
