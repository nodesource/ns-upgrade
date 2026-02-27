# Use the base image with Node 22 and ns-upgrade pre-installed
FROM ns-upgrade-test-base:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install unzip (needed for FNM)
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*

# Install Node.js 16.x via NodeSource distributions (system installation)
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Verify system Node.js 16 installation
RUN node --version && npm --version && \
    echo "✓ Node 16 installed as system Node"

# Install FNM (Fast Node Manager)
ENV FNM_DIR=/root/.local/share/fnm
ENV PATH=$FNM_DIR:$PATH
RUN curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell

# Add FNM to PATH and install Node 18
RUN bash -c "export PATH=\"$FNM_DIR:$PATH\" && \
    eval \"\$(fnm env)\" && \
    fnm install 18.20.0 && \
    fnm use 18.20.0 && \
    fnm default 18.20.0 && \
    node --version && \
    npm --version && \
    echo '✓ FNM installed with Node 18'"

# Make FNM available in shell
RUN echo 'export PATH="$FNM_DIR:$PATH"' >> /root/.bashrc && \
    echo 'eval "$(fnm env)"' >> /root/.bashrc

# Copy demo app
COPY test/docker/scenarios/node16-fnm-node18/demo-app /workspace/demo-app

# Install demo app dependencies with FNM Node 18
WORKDIR /workspace/demo-app
RUN echo "Installing demo app dependencies with Node $(bash -c 'export PATH=\"$FNM_DIR:$PATH\" && eval \"\$(fnm env)\" && node --version')" && \
    bash -c "export PATH=\"$FNM_DIR:$PATH\" && eval \"\$(fnm env)\" && npm install --production || echo 'Some dependencies may have warnings'"

# Verify complete environment
RUN node --version && \
    bash -c "export PATH=\"$FNM_DIR:$PATH\" && eval \"\$(fnm env)\" && fnm list" && \
    /opt/node22/bin/node --version && \
    echo "✓ System Node 16, FNM managing Node 18, Node 22 at /opt/node22"

# Set environment variables
ENV SCENARIO_NAME=node16-fnm-node18
ENV VERSION_MANAGER=fnm

# Default: show info and instructions (semi-automated testing)
CMD ["/workspace/info.sh"]
