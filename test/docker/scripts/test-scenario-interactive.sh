#!/bin/bash

# Semi-automated testing script for ns-upgrade Docker scenarios
# Launches a scenario container with interactive shell for manual CLI testing

if [ -z "$1" ]; then
  echo "Usage: $0 <scenario-name>"
  echo ""
  echo "Available scenarios:"
  echo "  - node8-system"
  echo "  - node8-ghost"
  echo "  - node8-syrjs-core"
  echo "  - node10-volta-node12"
  echo "  - node12-nvm-node14"
  echo "  - node12-gatsby"
  echo "  - node13-system"
  echo "  - node16-fnm-node18"
  echo "  - node16-nodegoat"
  echo "  - node18-nx-monorepo"
  echo "  - node20-system"
  echo "  - node20-turbo-monorepo"
  echo "  - node22-pcsclite"
  exit 1
fi

SCENARIO=$1
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"

cd "$PROJECT_ROOT"

echo "========================================="
echo "Semi-Automated Test: $SCENARIO"
echo "========================================="
echo ""

# Build the image
echo "🔨 Building image..."
if docker build -t "ns-upgrade-test-$SCENARIO" -f "test/docker/scenarios/$SCENARIO/Dockerfile" .; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

echo ""
echo "========================================="
echo "🚀 Launching interactive container..."
echo "========================================="
echo ""
echo "The container will show you instructions."
echo "Follow them to test ns-upgrade manually."
echo ""
echo "Press Enter to continue..."
read

# Create results directory
mkdir -p "$PROJECT_ROOT/test/docker/results"

# Run container with interactive TTY
# First show info, then drop into bash shell
DOCKER_ARGS=""
if [ "$SCENARIO" == "node8-ghost" ]; then
  DOCKER_ARGS="-p 2368:2368"
fi

docker run -it --rm \
  -v "$PROJECT_ROOT/test/docker/results:/results" \
  $DOCKER_ARGS \
  "ns-upgrade-test-$SCENARIO" \
  /bin/bash -c "/workspace/info.sh && exec /bin/bash"

echo ""
echo "========================================="
echo "Container session ended"
echo "========================================="
echo ""
echo "Check results in: test/docker/results/${SCENARIO}-discovery.json"
echo ""
