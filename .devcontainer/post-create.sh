#!/bin/bash
# ASDF-Web Codespace Post-Create Setup
# This script runs once when the codespace is created

set -e

echo "🔥 ASDF-Web Codespace Setup"
echo "=========================="

# Install project dependencies
echo "📦 Installing dependencies..."
npm install

# Generate package-lock.json if missing (for CI)
if [ ! -f "package-lock.json" ]; then
    echo "📝 Generating package-lock.json..."
    npm install --package-lock-only
fi

# Setup git configuration
echo "🔧 Configuring git..."
git config --global init.defaultBranch main
git config --global pull.rebase false

# Create directory structure
echo "📁 Setting up project structure..."
mkdir -p .claude/memory/decisions
mkdir -p .claude/memory/sessions
mkdir -p docs
mkdir -p tests/unit
mkdir -p tests/e2e

# Initialize Husky (creates .husky/_)
echo "🪝 Installing git hooks..."
npx husky install 2>/dev/null || true
chmod +x .husky/pre-commit 2>/dev/null || true

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install chromium

# Verify Claude CLI
echo "🤖 Verifying Claude CLI..."
if command -v claude &> /dev/null; then
    echo "✅ Claude CLI installed"
else
    echo "⚠️  Claude CLI not found, installing..."
    npm install -g @anthropic-ai/claude-code
fi

# MCP setup hint
if [ -n "$RENDER_API_KEY" ]; then
    echo "🔌 Render MCP configured"
fi

echo ""
echo "=========================="
echo "✅ ASDF-Web Codespace Ready!"
echo ""
echo "Next steps:"
echo "  1. claude login     - Authenticate with Claude Max"
echo "  2. npm start        - Start Express server"
echo "  3. npm run validate - Run all checks"
echo ""
echo "This is fine. 🐕‍🦺🔥"
