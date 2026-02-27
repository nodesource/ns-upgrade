# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 12.x via NodeSource distributions (system installation)
RUN curl -fsSL https://deb.nodesource.com/setup_12.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Verify system Node.js 12 installation
RUN node --version && npm --version && \
    echo "✓ Node 12 installed as system Node"

# Install NVM for Node 14 (this is what we're testing)
ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=14.21.3
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install Node 14 via NVM
RUN bash -c "source $NVM_DIR/nvm.sh && \
    nvm install ${NODE_VERSION} && \
    nvm use ${NODE_VERSION} && \
    nvm alias default ${NODE_VERSION} && \
    node --version && \
    npm --version && \
    echo '✓ NVM installed with Node 14'"

# Make NVM available in shell
RUN echo 'export NVM_DIR="$HOME/.nvm"' >> /root/.bashrc && \
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> /root/.bashrc && \
    echo '[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"' >> /root/.bashrc

# Copy demo app
COPY test/docker/scenarios/node12-nvm-node14/demo-app /workspace/demo-app

# Install demo app dependencies with NVM Node 14
WORKDIR /workspace/demo-app
RUN echo "Installing demo app dependencies with Node $(bash -c 'source $NVM_DIR/nvm.sh && nvm use ${NODE_VERSION} >/dev/null && node --version')" && \
    bash -c "source $NVM_DIR/nvm.sh && nvm use ${NODE_VERSION} && npm install --production || echo 'Some dependencies may have warnings'"

# Verify complete environment
RUN node --version && \
    bash -c "source $NVM_DIR/nvm.sh && nvm current" && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 12, NVM managing Node 14, Node 22 at /opt/node22"

# Set environment variables
ENV SCENARIO_NAME=node12-nvm-node14
ENV VERSION_MANAGER=nvm

# Default: show info and instructions (semi-automated testing)
CMD ["/workspace/info.sh"]
