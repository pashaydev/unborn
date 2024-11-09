# Build and test stage
FROM node:20-slim AS builder

# Install build dependencies for SQLite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    pkg-config \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source and test files
COPY . .

# Run tests with forced output
ENV NPM_CONFIG_LOGLEVEL=verbose
ENV CI=true
CMD ["sh", "-c", "npm test | cat"]

# Production stage
FROM node:20-slim

# Install production dependencies for SQLite3
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy app source from builder stage
COPY --from=builder /usr/src/app/src ./src

# Copy environment file
COPY .env ./.env

# Create new db.sqlite file
RUN touch db.sqlite

# Copy database file
COPY db.sqlite ./db.sqlite

# Create data directory for SQLite database
RUN mkdir -p /usr/src/app/data && \
    chmod 777 /usr/src/app/data

# Expose port (change if your app uses a different port)
EXPOSE 3000

# Set database path environment variable
ENV SQLITE_DB_PATH=/usr/src/app/data/db.sqlite

# Start command
CMD ["node", "src/index.js"]