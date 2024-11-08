# Use Node.js LTS (Long Term Support) as base image
FROM node:20-slim

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

# Copy app source
COPY src/ ./src

# Copy environment file
COPY .env ./.env

# Copy database file
COPY db.sqlite ./db.sqlite

# Create data directory for SQLite database
RUN mkdir -p /usr/src/app/data && \
    chmod 777 /usr/src/app/data

# Expose port (change if your app uses a different port)
EXPOSE 3000

# Set database path environment variable
ENV SQLITE_DB_PATH=/usr/src/app/db.sqlite

# Start command
CMD ["node", "src/index.js"]