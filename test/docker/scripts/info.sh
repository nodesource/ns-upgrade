#!/bin/bash

# Auto-detect scenario and version manager
detect_scenario() {
    if command -v volta &> /dev/null; then
        VERSION_MANAGER="volta"
        SCENARIO_NAME="node10-volta-node12"
    elif [ -d "/root/.nvm" ]; then
        VERSION_MANAGER="nvm"
        SCENARIO_NAME="node12-nvm-node14"
    elif command -v fnm &> /dev/null; then
        VERSION_MANAGER="fnm"
        SCENARIO_NAME="node16-fnm-node18"
    else
        VERSION_MANAGER="none"
        # Detect Node version to determine scenario
        NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
        case $NODE_VERSION in
            8) SCENARIO_NAME="node8-system" ;;
            13) SCENARIO_NAME="node13-system" ;;
            20) SCENARIO_NAME="node20-system" ;;
            *) SCENARIO_NAME="node${NODE_VERSION}-system" ;;
        esac
    fi
}

OUTPUT_FILE="/workspace/demo-app/discovery.json"
detect_scenario

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║          Node.js Upgrade Advisor - Test Scenario             ║"
echo "║                 $SCENARIO_NAME                    ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Display system information
echo "📋 System Information:"
echo "  OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')"
echo "  Node.js: $(node --version 2>/dev/null || echo 'N/A')"
echo "  npm: $(npm --version 2>/dev/null || echo 'N/A')"
echo "  Version Manager: $VERSION_MANAGER"

# Show version manager details
case $VERSION_MANAGER in
    "volta")
        echo "  Volta Toolchain:"
        volta list 2>/dev/null || echo "    No tools installed"
        ;;
    "nvm")
        echo "  NVM Versions:"
        bash -c "source /root/.nvm/nvm.sh && nvm list 2>/dev/null || echo '    No versions installed'"
        ;;
    "fnm")
        echo "  FNM Versions:"
        bash -c "export PATH=\"$FNM_DIR:$PATH\" && eval \"\$(fnm env)\" && fnm list 2>/dev/null || echo '    No versions installed'"
        ;;
esac

echo "  Working Directory: $(pwd)"
echo ""

# Display demo app info
if [ -f package.json ]; then
    echo "📦 Demo Application:"
    echo "  Name: $(node -p "require('./package.json').name" 2>/dev/null || echo 'N/A')"
    echo "  Version: $(node -p "require('./package.json').version" 2>/dev/null || echo 'N/A')"

    # Check for special dependency types
    if grep -q "file:" package.json 2>/dev/null; then
        echo "  ✓ Contains local packages (file: dependencies)"
    fi
    if grep -q "github:" package.json 2>/dev/null; then
        echo "  ✓ Contains git dependencies (github: dependencies)"
    fi
fi
echo ""

# Check if ns-upgrade is available
if [ ! -f "/workspace/ns-upgrade/bin/cli.js" ]; then
    echo "❌ ns-upgrade CLI not found at /workspace/ns-upgrade/bin/cli.js!"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Ready to run ns-upgrade!"
echo ""
echo "📝 INSTRUCTIONS:"
echo ""
echo "1. Run ns-upgrade directly with Node 22 (REQUIRED - CLI needs Node 22+):"
echo ""
echo "   /opt/node22/bin/node /workspace/ns-upgrade/bin/cli.js --output $OUTPUT_FILE"
echo ""
echo "   Note: /opt/node22/bin/node executes the CLI with Node 22"
echo "         Your system Node $(node --version 2>/dev/null || echo 'N/A') remains active for detection"
echo ""

# Add scenario-specific context
case $SCENARIO_NAME in
    "node12-nvm-node14")
        echo "         Your system has Node 12 + NVM managing Node 14"
        ;;
    "node16-fnm-node18")
        echo "         Your system has Node 16 + FNM managing Node 18"
        ;;
    "node10-volta-node12")
        echo "         Your system has Node 10 + Volta managing Node 12"
        ;;
esac

echo ""
echo "2. Answer the interactive prompts:"
echo "   - Accept the Terms of Service (y)"
echo "   - Select/confirm your Node.js version"
echo ""
echo "3. Wait for the analysis to complete"
echo ""
echo "4. Validate the results:"
echo ""
echo "   /workspace/validate-results.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
