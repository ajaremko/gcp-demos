FROM mcr.microsoft.com/devcontainers/typescript-node:22

# Install tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    bash \
    git \
    openssh-client \
    gnupg \
    lsb-release \
    apache2-utils \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Setup SSH directory for SSH agent forwarding
RUN mkdir -p /home/node/.ssh && chown -R node:node /home/node/.ssh

# Install Pulumi CLI
RUN mkdir -p /home/node/.pulumi && chown -R node:node /home/node/.pulumi

RUN curl -fsSL https://get.pulumi.com | sh -s -- --install-root "/home/node/.pulumi"

ENV PATH="/home/node/.pulumi/bin:${PATH}"

# Install Gcloud CLI
RUN curl https://dl.google.com/dl/cloudsdk/release/google-cloud-sdk.tar.gz > /tmp/google-cloud-sdk.tar.gz

RUN mkdir -p /usr/local/gcloud \
  && tar -C /usr/local/gcloud -xvf /tmp/google-cloud-sdk.tar.gz \
  && /usr/local/gcloud/google-cloud-sdk/install.sh

ENV PATH $PATH:/usr/local/gcloud/google-cloud-sdk/bin

RUN apt-get update && apt-get install -y wget gnupg \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer to use the installed Google Chrome instead of downloading Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install Nx CLI
RUN npm install -g nx@v23.1.1
