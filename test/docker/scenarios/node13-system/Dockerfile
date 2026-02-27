# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 13.14.0 (last 13.x version) from binary
RUN mkdir -p /usr/local/lib/nodejs && \
    curl -fsSL https://nodejs.org/dist/v13.14.0/node-v13.14.0-linux-x64.tar.xz -o /tmp/node13.tar.xz && \
    tar -xJf /tmp/node13.tar.xz -C /usr/local/lib/nodejs && \
    rm /tmp/node13.tar.xz

# Add Node.js 13 to PATH
ENV PATH=/usr/local/lib/nodejs/node-v13.14.0-linux-x64/bin:$PATH

# Verify Node.js 13 installation
RUN node --version && npm --version && \
    echo "✓ Node 13 installed as system Node"

# Copy demo app
COPY test/docker/scenarios/node13-system/demo-app /workspace/demo-app

# Install demo app dependencies with Node 13
WORKDIR /workspace/demo-app
RUN echo "Installing demo app dependencies with Node $(node --version)" && \
    npm install --production || echo "Some dependencies may have warnings"

# Verify complete environment
RUN node --version && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 13, Node 22 at /opt/node22 for CLI"

# Set environment variables
ENV SCENARIO_NAME=node13-system
ENV VERSION_MANAGER=none

# Default: show info and instructions (semi-automated testing)
CMD ["/workspace/info.sh"]
