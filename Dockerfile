# Use the official Go image matching your version. Alpine variant is smaller.
FROM golang:1.23-alpine AS builder

# Install build tools needed: git (for go modules), build-base (for CGO, just in case),
# curl (to download sqlc), and potentially goose if running migrations here.
RUN apk add --no-cache git build-base curl

# Set the working directory inside the container
WORKDIR /app

ARG SQLC_VERSION=v1.28.0
# Download, extract, and place sqlc binary in PATH
RUN curl -Ls "https://github.com/sqlc-dev/sqlc/releases/download/v1.28.0/sqlc_1.28.0_linux_amd64.tar.gz" | tar -xz -C /usr/local/bin sqlc
# Verify (optional)
RUN sqlc version

ARG GOOSE_VERSION=latest
RUN go install github.com/pressly/goose/v3/cmd/goose@${GOOSE_VERSION}
RUN cp /go/bin/goose /usr/local/bin/goose

# Download Go module dependencies first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire project source code
COPY . .

# Generate Go code from SQL using sqlc
# Assumes sqlc.yaml is in the root WORKDIR (/app)
RUN sqlc generate

# Build the Go application binary
# - CGO_ENABLED=0: Build without CGO for smaller, static binary (usually works unless you use C libraries)
# - GOOS=linux GOARCH=amd64: Explicitly build for linux/amd64 runtime environment
# - -ldflags="-w -s": Strip debug information to reduce binary size
# - -o /app/server: Output the executable as 'server' in /app directory
# - ./: Path to main package (where main.go is)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/server .


# Stage 2: Create the final minimal runtime image
FROM alpine:latest

# Install certificates for making potential HTTPS requests from Go app
# and tzdata for timezone support (e.g., if using time.Local)
RUN apk add --no-cache ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy the compiled executable from the builder stage
COPY --from=builder /app/server /app/server

COPY --from=builder /app/public ./public

# If running goose migrations from the container, copy the migration files
COPY --from=builder /app/sql/schema ./sql/schema 
COPY --from=builder /usr/local/bin/goose /usr/local/bin/goose


# Expose the port the application will listen on.
# Your Go app should listen on the $PORT environment variable provided by the platform.
# Render/Fly typically provide 8080 or 10000. Exposing it here is documentary.
EXPOSE 8080

# Set the command to run when the container starts
# The '/app/server' executable should read $PORT, $DATABASE_URL, $JWT_SECRET from the environment.
CMD ["/app/server"]