# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20.x via NodeSource distributions (latest LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Verify Node.js 20 installation
RUN node --version && npm --version && \
    echo "✓ Node 20 installed as system Node"

# Copy demo app
COPY test/docker/scenarios/node20-system/demo-app /workspace/demo-app

# Install demo app dependencies with Node 20
WORKDIR /workspace/demo-app
RUN echo "Installing demo app dependencies with Node $(node --version)" && \
    npm install --production || echo "Some dependencies may have warnings"

# Verify complete environment
RUN node --version && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 20, Node 22 at /opt/node22 for CLI"

# Set environment variables
ENV SCENARIO_NAME=node20-system
ENV VERSION_MANAGER=none

# Default: show info and instructions (semi-automated testing)
CMD ["/workspace/info.sh"]
