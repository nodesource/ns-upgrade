# Use base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

# Install test Node version (Node 8)
# Install test Node version (Node 8.17.0)
RUN curl -fsSL https://nodejs.org/dist/v8.17.0/node-v8.17.0-linux-x64.tar.gz -o node.tar.gz && \
    tar -xzf node.tar.gz -C /usr/local --strip-components=1 && \
    rm node.tar.gz

# Clone demo app from GitHub
RUN git clone https://github.com/syrjs/core.git /workspace/demo-app

# Install demo app dependencies
WORKDIR /workspace/demo-app
RUN npm install --production --unsafe-perm

# Set environment variables
ENV SCENARIO_NAME=node8-syrjs-core
ENV VERSION_MANAGER=none
