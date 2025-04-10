package api_test

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/5tuartw/droplet/internal/auth"
	"github.com/5tuartw/droplet/internal/config"
	"github.com/5tuartw/droplet/internal/database"
	_ "github.com/lib/pq"
	"github.com/ory/dockertest"
	"github.com/ory/dockertest/docker"
)

var testDB *sql.DB

func TestMain(m *testing.M) {
	log.Println("Setting up test database with Docker")

	// Connect to Docker - requires Docker to be running
	pool, err := dockertest.NewPool("")
	if err != nil {
		log.Fatalf("Could not construct pool: %s", err)
	}

	//*** Can you explain what a pool is in Docker?
	err = pool.Client.Ping()
	if err != nil {
		log.Fatalf("Could not connect to Docker: %s", err)
	}
	log.Println("Connected to Docker successfully.")

	// Start PostgreSQL container
	// options
	opts := dockertest.RunOptions{
		Repository: "postgres",  // image name
		Tag:        "16-alpine", // version tag
		Env: []string{
			"POSTGRES_PASSWORD=te5ting",
			"POSTGRES_USER=test_user",
			"POSTGRES_DB=droplet_test",
			"listen_addresses = '*'", // allows connections from outside container
		},
		ExposedPorts: []string{"5432"},
		PortBindings: map[docker.Port][]docker.PortBinding{
			"5432/tcp": {{HostIP: "127.0.0.1", HostPort: "5433"}}, // Using fixed host port 5433
		},
	}
	log.Printf("opts: PortBindings = %s\n", opts.PortBindings)
	// Start container
	resource, err := pool.RunWithOptions(&opts, func(config *docker.HostConfig) {
		config.AutoRemove = true                                // automatically removed on stop
		config.RestartPolicy = docker.RestartPolicy{Name: "no"} // ensure transient test container
	})
	if err != nil {
		log.Fatalf("Could not start PostgreSQL container: %s", err)
	}
	log.Println("PostgreSQL container started.")

	// Setup container teardown
	// Stops and removes container when tests finish, even if panic
	defer func() {
		log.Println("Purging PostgreSQL container...")
		if err := pool.Purge(resource); err != nil {
			log.Fatalf("Could not purge resource: %s", err)
		}
		log.Println("PostgreSQL container purged")
	}()

	// Set timeout for container 180 seconds
	if err := resource.Expire(180); err != nil {
		log.Printf("Could not set experiration on resource: %s", err)
	}

	// Wait for database readiness and get connection string
	//hostPort := resource.GetHostPort("5432/tcp")
	hostPort := "5433"
	testDBConnectionString := fmt.Sprintf("postgres://test_user:te5ting@localhost:%s/droplet_test?sslmode=disable", hostPort)
	log.Printf("Attempting to connect to test database on: %s", testDBConnectionString)

	// Use exponential backoff-retry from dockertest to wait for the DB
	pool.MaxWait = 120 * time.Second
	if err = pool.Retry(func() error {
		var err error
		testDB, err = sql.Open("postgres", testDBConnectionString)
		if err != nil {
			return fmt.Errorf("error opening test database connection: %w", err)
		}
		return testDB.Ping()
	}); err != nil {
		log.Fatalf("Could not connect to the test database: %s", err)
	}
	log.Println("Test database connection successful.")

	// Run database migrations
	migrationsDir := "../../sql/schema"

	absMigrationDir, err := filepath.Abs(migrationsDir)
	if err != nil {
		log.Fatalf("Could not get absolute path for migrations dir: %s", err)
	}

	log.Printf("Running goose migrations from directory: %s", absMigrationDir)
	cmd := exec.Command("goose", "-dir", absMigrationDir, "postgres", testDBConnectionString, "up")
	cmd.Stdout = os.Stdout // Show goose output
	cmd.Stderr = os.Stderr
	err = cmd.Run()
	if err != nil {
		log.Fatalf("Failed to run goose migrations: %s", err)
	}
	log.Println("Migrations applied successfully.")

	// Run tests
	log.Println("Running tests...")
	exitCode := m.Run()
	log.Printf("Tests finished with exit code: %d\n", exitCode)

	// Exit
	if testDB != nil {
		testDB.Close()
	}

}

func TestDatabaseConnection(t *testing.T) {
	if testDB == nil {
		t.Fatalf("Test database connection pool (testDB) is nil")
	}

	var one int
	err := testDB.QueryRow("SELECT 1").Scan(&one)
	if err != nil {
		t.Fatalf("Failed to execute simple query on test DB: %v", err)
	}

	if one != 1 {
		t.Errorf("Expected to select 1, but got %d", one)
	}
	t.Log("Successfully executed simple query on test DB.")
}

func newTestServer(t *testing.T, db *sql.DB) http.Handler {
	t.Helper()

	testQueries := database.New(db)
	testCfg := &config.ApiConfig{
		JWTSecret: "test_jwt_secret_key_1234567890",
		Port:	"8080",
	}

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/login", func(w http.ResponseWriter, r *http.Request) {
		auth.Login(testCfg, testQueries, w, r)
	})

	//add token handlers too for testing?

	return mux
}
