FROM ns-upgrade-test-base:latest

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Set scenario name for validation script
ENV SCENARIO_NAME=node18-nx-monorepo

# Clone the Nx monorepo demo
WORKDIR /workspace
RUN git clone https://github.com/tkssharma/nestjs-microservices.git demo-app

# Install dependencies to ensure pnpm/nx are available if needed
WORKDIR /workspace/demo-app
# The repo seems to use yarn or npm, let's check.
# But for the purpose of scanning, just cloning is enough.
# We'll install dependencies to be safe and realistic.
RUN npm install

# Reset workdir
WORKDIR /workspace/demo-app
