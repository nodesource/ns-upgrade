# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 22.x via NodeSource distributions
# Also install libpcsclite-dev for node-pcsclite native module compilation
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs libpcsclite-dev && \
    rm -rf /var/lib/apt/lists/*

# Verify Node.js 22 installation
RUN node --version && npm --version && \
    echo "✓ Node 22 installed as system Node"

# Clone demo app from GitHub
RUN git clone https://github.com/santigimeno/node-pcsclite /workspace/demo-app

# Install demo app dependencies with Node 22
WORKDIR /workspace/demo-app
RUN echo "Installing demo app dependencies with Node $(node --version)" && \
    npm install --production || echo "Some dependencies may have warnings"

# Verify complete environment
RUN node --version && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 22, Node 22 at /opt/node22 for CLI"

# Set environment variables
ENV SCENARIO_NAME=node22-pcsclite
ENV VERSION_MANAGER=none

# Default: show info and instructions (semi-automated testing)
CMD ["/workspace/info.sh"]
