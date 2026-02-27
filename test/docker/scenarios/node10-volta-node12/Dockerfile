# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 10.x via NodeSource distributions (system installation)
RUN curl -fsSL https://deb.nodesource.com/setup_10.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Verify system Node.js 10 installation
RUN node --version && npm --version && \
    echo "✓ Node 10 installed as system Node"

# Install Volta
ENV VOLTA_HOME=/root/.volta
ENV PATH=$VOLTA_HOME/bin:$PATH
RUN curl https://get.volta.sh | bash

# Install Node 12 via Volta
RUN volta install node@12.22.12

# Verify Volta installation
RUN volta list && echo "✓ Volta installed with Node 12"

# Copy demo app
COPY test/docker/scenarios/node10-volta-node12/demo-app /workspace/demo-app

# Pin Node 12 for the demo app
WORKDIR /workspace/demo-app
RUN volta pin node@12.22.12

# Install demo app dependencies with Volta-managed Node
RUN echo "Installing demo app dependencies with Node $(node --version)" && \
    npm install --production || echo "Some dependencies may have warnings"

# Verify complete environment
RUN node --version && \
    volta --version && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 10, Volta with Node 12, Node 22 at /opt/node22"

# Set environment variables
ENV SCENARIO_NAME=node10-volta-node12
ENV VERSION_MANAGER=volta

# Default: show info and instructions (semi-automated testing)
CMD ["/workspace/info.sh"]
