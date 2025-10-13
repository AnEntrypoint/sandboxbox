# Test Dockerfile for SandboxBox
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip postinstall scripts for testing)
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Default command
CMD ["npm", "start"]