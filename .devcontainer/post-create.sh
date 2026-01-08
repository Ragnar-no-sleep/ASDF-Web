#!/bin/bash
# ASDF-Web Codespace Post-Create Setup
# This script runs once when the codespace is created

set -e

echo "🔥 ASDF-Web Codespace Setup"
echo "=========================="

# Install project dependencies
echo "📦 Installing dependencies..."
npm install

# Setup git configuration for commits
echo "🔧 Configuring git..."
git config --global init.defaultBranch main
git config --global pull.rebase false

# Create Claude memory directories if they don't exist
echo "🧠 Setting up Claude memory structure..."
mkdir -p .claude/memory/decisions
mkdir -p .claude/memory/sessions

# Setup pre-commit hooks
echo "🪝 Installing git hooks..."
if [ -f ".husky/pre-commit" ]; then
    npx husky install
fi

# Verify Claude CLI installation
echo "🤖 Verifying Claude CLI..."
if command -v claude &> /dev/null; then
    echo "✅ Claude CLI installed"
    echo ""
    echo "📝 Pour activer Claude avec ton compte Max:"
    echo "   claude login"
else
    echo "⚠️  Claude CLI not found, installing..."
    npm install -g @anthropic-ai/claude-code
fi

# Setup MCP configuration if API keys are present
if [ -n "$RENDER_API_KEY" ]; then
    echo "🔌 Render MCP configured"
fi

echo ""
echo "=========================="
echo "✅ ASDF-Web Codespace Ready!"
echo ""
echo "Quick commands:"
echo "  npm run dev     - Start dev server"
echo "  npm test        - Run tests"
echo "  npm run lint    - Check code quality"
echo "  claude          - Start Claude CLI"
echo ""
echo "This is fine. 🐕‍🦺🔥"
