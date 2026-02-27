FROM ns-upgrade-test-base:latest

# Install Node.js 12
RUN curl -fsSL https://deb.nodesource.com/setup_12.x | bash - && \
    apt-get install -y nodejs

# Set scenario name for validation script
ENV SCENARIO_NAME=node12-gatsby

# Clone the Gatsby repo at release/4.0
WORKDIR /workspace
RUN git clone --branch release/4.0 https://github.com/gatsbyjs/gatsby.git demo-app

# Install dependencies
WORKDIR /workspace/demo-app
# Gatsby repo is a monorepo using yarn usually.
# We'll try to install, but allow failure as we just need the structure for scanning.
RUN npm install -g yarn && yarn install || true

# Reset workdir
WORKDIR /workspace/demo-app
