#!/bin/bash
# ASDF-Web + CYNIC Codespace Post-Create Setup
# This script runs once when the codespace is created

set -e

echo ""
echo "========================================"
echo "  ASDF-Web + CYNIC Codespace Setup"
echo "  Don't trust. Verify."
echo "========================================"
echo ""

# ==========================================
# 1. ASDF-WEB SETUP
# ==========================================

echo "[1/6] Installing ASDF-Web dependencies..."
npm install

# Generate package-lock.json if missing
if [ ! -f "package-lock.json" ]; then
    npm install --package-lock-only
fi

# ==========================================
# 2. GIT CONFIGURATION
# ==========================================

echo "[2/6] Configuring git..."
git config --global init.defaultBranch main
git config --global pull.rebase false

# ==========================================
# 3. DIRECTORY STRUCTURE
# ==========================================

echo "[3/6] Setting up project structure..."
mkdir -p .claude/memory/decisions
mkdir -p .claude/memory/sessions
mkdir -p docs
mkdir -p tests/unit
mkdir -p tests/e2e
mkdir -p ecosystem

# ==========================================
# 4. CYNIC SETUP
# ==========================================

echo "[4/6] Setting up CYNIC ecosystem..."

# Clone CYNIC if not exists
if [ ! -d "ecosystem/CYNIC" ]; then
    echo "  Cloning CYNIC..."
    git clone --depth 1 https://github.com/zeyxx/CYNIC.git ecosystem/CYNIC
    cd ecosystem/CYNIC
    pnpm install
    cd ../..
fi

# Clone asdf-brain if not exists
if [ ! -d "ecosystem/asdf-brain" ]; then
    echo "  Cloning asdf-brain..."
    git clone --depth 1 https://github.com/zeyxx/asdf-brain.git ecosystem/asdf-brain
fi

# Clone asdf-manifesto if not exists
if [ ! -d "ecosystem/asdf-manifesto" ]; then
    echo "  Cloning asdf-manifesto..."
    git clone --depth 1 https://github.com/zeyxx/asdf-manifesto.git ecosystem/asdf-manifesto
fi

# ==========================================
# 5. GIT HOOKS & TESTING
# ==========================================

echo "[5/6] Installing git hooks & test tools..."

# Initialize Husky
npx husky install 2>/dev/null || true
chmod +x .husky/pre-commit 2>/dev/null || true

# Install Playwright browsers
npx playwright install chromium --with-deps 2>/dev/null || true

# ==========================================
# 6. CLAUDE CLI SETUP
# ==========================================

echo "[6/6] Verifying Claude CLI..."

if command -v claude &> /dev/null; then
    echo "  Claude CLI installed"
    claude --version
else
    echo "  Installing Claude CLI..."
    npm install -g @anthropic-ai/claude-code
fi

# Install claude-mem plugin if available
if command -v claude &> /dev/null; then
    echo "  Setting up claude-mem plugin..."
    claude mcp add claude-mem -s user -- npx -y @anthropic-ai/claude-mem 2>/dev/null || true
fi

# ==========================================
# DONE
# ==========================================

echo ""
echo "========================================"
echo "  ASDF-Web + CYNIC Codespace Ready!"
echo "========================================"
echo ""
echo "Ecosystem repos cloned to ./ecosystem/"
echo ""
echo "Quick Start:"
echo "  npm start           - Start ASDF-Web server (port 3000)"
echo "  npm run dev         - Start Vite dev server (port 5173)"
echo "  npm test            - Run 73 unit tests"
echo "  npm run test:e2e    - Run Playwright E2E tests"
echo ""
echo "CYNIC Commands:"
echo "  cd ecosystem/CYNIC && pnpm dev  - Start CYNIC node"
echo ""
echo "Claude Commands:"
echo "  claude              - Start Claude Code session"
echo "  claude login        - Authenticate with Claude Max"
echo ""
echo "This is fine."
echo ""
