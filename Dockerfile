# Stage 1: Build the React frontend
FROM node:18 AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the C++ server
FROM ubuntu:22.04 AS backend-builder

# Prevent interactive prompts during apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install all necessary C++ build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    libsqlite3-dev \
    sqlite3

# Set the working directory
WORKDIR /app

# Copy the server source code into the container
COPY server/ ./server/

# Create a build directory and run CMake
WORKDIR /app/server/build
RUN cmake .. -DCMAKE_BUILD_TYPE=Release
RUN make -j$(nproc)

# Stage 2: Create a lightweight runtime image
FROM ubuntu:22.04

# Install runtime dependencies (SQLite and SSL certificates)
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=backend-builder /app/server/build/think-and-type-server .

# Copy the data folder (dictionaries and SQLite DB)
COPY --from=backend-builder /app/server/data ./data

# Copy the React frontend into the static directory for Crow to serve
COPY --from=frontend-builder /app/client/dist ./static

# Render automatically assigns a PORT environment variable.
# We will tell the container to run our server and pass that port to it.
CMD ["sh", "-c", "./think-and-type-server ${PORT:-10000}"]
