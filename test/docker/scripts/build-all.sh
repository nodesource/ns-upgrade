#!/bin/bash

set -e

echo "========================================="
echo "Building all Docker test scenarios"
echo "========================================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOCKER_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
PROJECT_ROOT="$( cd "$DOCKER_DIR/../.." && pwd )"

# Build from project root for correct context
cd "$PROJECT_ROOT"

SCENARIOS=(
  "node8-system"
  "node8-ghost"
  "node8-syrjs-core"
  "node10-volta-node12"
  "node12-nvm-node14"
  "node12-gatsby"
  "node13-system"
  "node16-fnm-node18"
  "node16-nodegoat"
  "node18-nx-monorepo"
  "node20-system"
  "node20-turbo-monorepo"
  "node22-pcsclite"
)

# Allow building specific scenarios passed as arguments
if [ "$#" -gt 0 ]; then
  SCENARIOS=("$@")
fi

# Build base image first
echo "🔨 Building base image..."
docker build -t ns-upgrade-test-base -f test/docker/base/Dockerfile.base .

if [ $? -eq 0 ]; then
  echo "✅ Base image built successfully"
  echo ""
else
  echo "❌ Failed to build base image"
  exit 1
fi

# Build each scenario
BUILT=0
FAILED=0

for scenario in "${SCENARIOS[@]}"; do
  echo "🔨 Building scenario: $scenario..."

  if docker build -t "ns-upgrade-test-$scenario" -f "test/docker/scenarios/$scenario/Dockerfile" .; then
    echo "✅ $scenario built successfully"
    BUILT=$((BUILT + 1))
  else
    echo "❌ Failed to build $scenario"
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

echo "========================================="
echo "Build Summary"
echo "========================================="
echo "Total scenarios: ${#SCENARIOS[@]}"
echo "Built successfully: $BUILT"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All images built successfully!"
  exit 0
else
  echo "❌ $FAILED image(s) failed to build"
  exit 1
fi
