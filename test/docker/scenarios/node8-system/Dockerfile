# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 8.17.0 from binary (for EOL version compatibility)
RUN curl -fsSL https://nodejs.org/dist/v8.17.0/node-v8.17.0-linux-x64.tar.xz -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 && \
    rm /tmp/node.tar.xz

# Verify Node.js 8 installation
RUN node --version && npm --version && \
    echo "✓ Node 8 installed as system Node"

# Copy demo app
COPY test/docker/scenarios/node8-system/demo-app /workspace/demo-app

# Install demo app dependencies with Node 8
WORKDIR /workspace/demo-app
RUN echo "Installing demo app dependencies with Node $(node --version)" && \
    npm install --production || echo "Some dependencies may have warnings"

# Verify complete environment
RUN node --version && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 8, Node 22 at /opt/node22 for CLI"

# Set environment variables
ENV SCENARIO_NAME=node8-system
ENV VERSION_MANAGER=none

# Default: show info and instructions (semi-automated testing)
CMD ["/workspace/info.sh"]
