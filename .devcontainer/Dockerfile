# ASDF-Web + CYNIC Development Container
# Portable, reproducible environment for GitHub Codespaces

FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Metadata
LABEL maintainer="ASDF Team"
LABEL description="ASDF-Web + CYNIC development environment"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    build-essential \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally (for CYNIC workspace)
RUN npm install -g pnpm@latest

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Install Bun (for claude-mem)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Set working directory
WORKDIR /workspaces/ASDF-Web

# Environment variables
ENV NODE_ENV=development
ENV EDITOR=code
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

# Default command
CMD ["sleep", "infinity"]
