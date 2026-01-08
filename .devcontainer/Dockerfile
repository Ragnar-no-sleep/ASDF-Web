# ASDF-Web Development Container
# Portable, reproducible environment for GitHub Codespaces

FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Metadata
LABEL maintainer="ASDF Team"
LABEL description="ASDF-Web development environment with Claude CLI and testing tools"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Install testing tools globally
RUN npm install -g \
    eslint \
    prettier \
    jest \
    playwright

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Set working directory
WORKDIR /workspaces/ASDF-Web

# Environment variables
ENV NODE_ENV=development
ENV EDITOR=code

# Default command
CMD ["sleep", "infinity"]
