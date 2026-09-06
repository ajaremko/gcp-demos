FROM mcr.microsoft.com/devcontainers/python:3.12

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
RUN mkdir -p /home/vscode/.ssh && chown -R vscode:vscode /home/vscode/.ssh

# Install Pulumi CLI
RUN mkdir -p /home/vscode/.pulumi && chown -R vscode:vscode /home/vscode/.pulumi

RUN curl -fsSL https://get.pulumi.com | sh -s -- --install-root "/home/vscode/.pulumi"

ENV PATH="/home/vscode/.pulumi/bin:${PATH}"

# Install Gcloud CLI
RUN curl https://dl.google.com/dl/cloudsdk/release/google-cloud-sdk.tar.gz > /tmp/google-cloud-sdk.tar.gz

RUN mkdir -p /usr/local/gcloud \
  && tar -C /usr/local/gcloud -xvf /tmp/google-cloud-sdk.tar.gz \
  && /usr/local/gcloud/google-cloud-sdk/install.sh

ENV PATH="/usr/local/gcloud/google-cloud-sdk/bin:${PATH}"

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/