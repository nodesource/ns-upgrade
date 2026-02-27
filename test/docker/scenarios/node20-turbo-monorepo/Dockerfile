FROM ns-upgrade-test-base:latest

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Enable corepack for pnpm/yarn support
RUN corepack enable

# Set scenario name for validation script
ENV SCENARIO_NAME=node20-turbo-monorepo

# Clone the Turbo monorepo demo
WORKDIR /workspace
RUN git clone https://github.com/developer239/nest-vite-fullstack-microservices-poc.git demo-app

# Install dependencies
WORKDIR /workspace/demo-app
# Try to install dependencies. If it fails, we still have the repo for scanning.
# Using || true to prevent build failure if install fails (e.g. due to missing system deps)
RUN npm install || true

# Reset workdir
WORKDIR /workspace/demo-app
