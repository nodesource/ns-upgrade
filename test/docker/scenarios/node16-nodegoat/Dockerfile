# Use base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

# Install test Node version (Node 16)
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Clone demo app from GitHub
RUN git clone https://github.com/OWASP/NodejsGoat /workspace/demo-app

# Install demo app dependencies
WORKDIR /workspace/demo-app
# NodeGoat might need some specific install flags or just npm install
# Using --production to match typical deployment, but NodeGoat is a test app so maybe full install is better?
# The docs example used --production. I'll stick to that unless it fails.
# Also NodeGoat has a postinstall script that might need tools.
RUN npm install --production --unsafe-perm

# Set environment variables
ENV SCENARIO_NAME=node16-nodegoat
ENV VERSION_MANAGER=none
