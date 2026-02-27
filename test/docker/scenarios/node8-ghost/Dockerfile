# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 8.17.0 from binary
RUN curl -fsSL https://nodejs.org/dist/v8.17.0/node-v8.17.0-linux-x64.tar.xz -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 && \
    rm /tmp/node.tar.xz

# Verify Node.js 8 installation
RUN node --version && npm --version && \
    echo "✓ Node 8 installed as system Node"

# Install build dependencies for native modules (sqlite3, etc.)
# Python 2 is usually required for Node 8 native modules
RUN apt-get update && apt-get install -y \
    python \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Download Ghost v1.25.5
WORKDIR /workspace/demo-app
# Download Ghost v1.25.5 with submodules (needed for default theme)
RUN git clone --recurse-submodules --branch 1.25.5 https://github.com/TryGhost/Ghost.git .

# Install Yarn and knex-migrator globally
RUN npm install -g yarn knex-migrator

# Install Ghost dependencies and run setup
# --unsafe-perm is often needed when running as root
RUN echo "Installing Ghost dependencies with Yarn" && \
    yarn setup

# Verify complete environment
RUN node --version && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 8, Node 22 at /opt/node22 for CLI"

# Set environment variables
ENV SCENARIO_NAME=node8-ghost
ENV VERSION_MANAGER=none
ENV server__host=0.0.0.0
ENV server__port=2368

# Default: show info and instructions
EXPOSE 2368
CMD ["/workspace/info.sh"]
