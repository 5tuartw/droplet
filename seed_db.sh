#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

# --- Configuration (Adjust paths if necessary) ---
SEED_SQL_FILE="./seed_data/init_school_data.sql" # Path relative to project root
SEED_USERS_DIR="./internal/seed_data/load_users"       # Path relative to project root
SEED_PUPILS_DIR="./internal/seed_data/load_pupils"      # Path relative to project root

# --- Prerequisites Check ---
echo "Checking prerequisites..."

# Check for Go command
if ! command -v go &> /dev/null; then
    echo "ERROR: 'go' command not found. Please install Go."
    exit 1
fi

# Check for psql command
if ! command -v psql &> /dev/null; then
    echo "ERROR: 'psql' command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "----------------------------------------------------------------------"
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Please set it to your target database connection string before running."
  echo "Example for Render External URL:"
  echo "  export DATABASE_URL=\"postgres://user:pwd@external-host:5432/db?sslmode=require\""
  echo "----------------------------------------------------------------------"
  exit 1
fi

echo "Prerequisites met. Starting database seed process for target:"
# Obfuscate password in log output
echo "${DATABASE_URL/@*:/@*****:}"
echo "----------------------------------------------------------------------"


# --- Execute Seeding Steps ---

echo "[1/3] Loading School Structure (SQL)..."
psql "$DATABASE_URL" -a -f "$SEED_SQL_FILE"
echo "      School structure loaded successfully."

echo "[2/3] Loading Basic Users..."
# Optional: go mod tidy "$SEED_USERS_DIR" # Uncomment if needed for the user script
go run "$SEED_USERS_DIR"
echo "      Users loaded successfully."


echo "[3/3] Loading Basic Pupils..."
# Optional: go mod tidy "$SEED_PUPILS_DIR" # Uncomment if needed for the pupil script
go run "$SEED_PUPILS_DIR"
echo "      Pupils loaded successfully."


echo "----------------------------------------------------------------------"
echo "✅ Database Seed Process Completed Successfully!"
echo "----------------------------------------------------------------------"

exit 0