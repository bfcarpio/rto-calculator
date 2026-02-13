#!/bin/bash
#
# Start Playwright Server Script
#
# Manages the dev server startup for Playwright e2e tests.
# Starts the preview server, waits for the port to be ready,
# and handles cleanup on exit.
#
# Usage:
#   ./start-playwright-server.sh              # Start and wait
#   ./start-playwright-server.sh --detach     # Start in background and exit
#   ./start-playwright-server.sh --port 3000  # Use custom port
#   ./start-playwright-server.sh --timeout 30   # 30 second timeout
#

set -euo pipefail

# Configuration with defaults
PORT=4321
TIMEOUT=60
DETACH=false
SERVER_PID=""

# Parse command line arguments
parseArguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --detach)
                DETACH=true
                shift
                ;;
            --port)
                PORT="${2:-4321}"
                shift 2
                ;;
            --timeout)
                TIMEOUT="${2:-60}"
                shift 2
                ;;
            --help|-h)
                showHelp
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                showHelp
                exit 1
                ;;
        esac
    done
}

# Display usage information
showHelp() {
    cat << 'EOF'
Usage: start-playwright-server.sh [OPTIONS]

Starts the preview server for Playwright e2e tests.

OPTIONS:
    --detach          Start server in background and exit (for CI)
    --port PORT       Port to use (default: 4321)
    --timeout SECONDS Timeout in seconds (default: 60)
    --help, -h        Show this help message

EXAMPLES:
    ./start-playwright-server.sh
    ./start-playwright-server.sh --detach
    ./start-playwright-server.sh --port 3000 --timeout 30

EOF
}

# Cleanup function to kill the server process
cleanup() {
    local exit_code=$?

    if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
        echo ""
        echo "Cleaning up server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
        echo "Server stopped."
    fi

    exit $exit_code
}

# Set up signal handlers for cleanup
trap cleanup SIGINT SIGTERM EXIT

# Check if a port is ready
isPortReady() {
    local port=$1
    local host="localhost"

    # Try to connect to the port
    if command -v nc >/dev/null 2>&1; then
        nc -z "$host" "$port" 2>/dev/null
    elif command -v curl >/dev/null 2>&1; then
        curl -s "http://$host:$port" >/dev/null 2>&1
    elif command -v wget >/dev/null 2>&1; then
        wget -q --spider "http://$host:$port" 2>/dev/null
    else
        # Fallback: check if port is listening using /dev/tcp
        timeout 1 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null
    fi
}

# Start the preview server
startServer() {
    echo "Starting preview server on port $PORT..."

    # Check if port is already in use
    if isPortReady "$PORT"; then
        echo "Port $PORT is already in use. Server may already be running."
        return 0
    fi

    # Start the server in background
    npm run preview &
    SERVER_PID=$!

    echo "Server started with PID: $SERVER_PID"
}

# Wait for the server to be ready
waitForServer() {
    local elapsed=0
    local check_interval=2

    echo ""
    echo "Waiting for server at http://localhost:$PORT..."
    echo "Timeout: ${TIMEOUT}s | Check interval: ${check_interval}s"
    echo ""

    while [[ $elapsed -lt $TIMEOUT ]]; do
        if isPortReady "$PORT"; then
            echo ""
            echo "=================================="
            echo "Server ready at http://localhost:$PORT"
            echo "=================================="
            return 0
        fi

        echo "  [$elapsed/${TIMEOUT}s] Waiting for server..."
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done

    echo ""
    echo "ERROR: Server failed to start within ${TIMEOUT} seconds"
    return 1
}

# Main execution
main() {
    parseArguments "$@"

    echo "========================================"
    echo "Playwright Server Manager"
    echo "========================================"
    echo "Port:    $PORT"
    echo "Timeout: ${TIMEOUT}s"
    echo "Detach:  $DETACH"
    echo ""

    startServer

    if ! waitForServer; then
        exit 1
    fi

    if [[ "$DETACH" == true ]]; then
        echo ""
        echo "Detach mode: Server running in background (PID: $SERVER_PID)"
        echo "Use 'kill $SERVER_PID' to stop the server"
        # Remove exit trap so we don't kill the server on exit
        trap - EXIT
        exit 0
    fi

    echo ""
    echo "Server is running. Press Ctrl+C to stop."
    echo ""

    # Wait for the server process
    if [[ -n "$SERVER_PID" ]]; then
        wait "$SERVER_PID"
    else
        # If no server PID (port was already in use), just wait indefinitely
        while true; do
            sleep 1
        done
    fi
}

# Run main function
main "$@"
