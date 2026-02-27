#!/bin/bash

# Auto-detect scenario name from environment or path
detect_scenario() {
    if [ -n "$SCENARIO_NAME" ]; then
        echo "$SCENARIO_NAME"
    else
        # Fallback: detect from current directory or environment
        if command -v volta &> /dev/null; then
            echo "node10-volta-node12"
        elif [ -d "/root/.nvm" ]; then
            echo "node12-nvm-node14"
        elif command -v fnm &> /dev/null; then
            echo "node16-fnm-node18"
        else
            # Detect Node version to determine scenario
            NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
            case $NODE_VERSION in
                8) echo "node8-system" ;;
                13) echo "node13-system" ;;
                20) echo "node20-system" ;;
                *) echo "node${NODE_VERSION}-system" ;;
            esac
        fi
    fi
}

OUTPUT_FILE="/workspace/demo-app/discovery.json"
SCENARIO_NAME=$(detect_scenario)
RESULTS_DIR="/results"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║             Validating Test Results                          ║"
echo "║                 $SCENARIO_NAME                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if output file exists
if [ ! -f "$OUTPUT_FILE" ]; then
    echo "❌ Error: Output file not found at $OUTPUT_FILE"
    echo ""
    echo "Did you run ns-upgrade? Use this command:"
    echo "  /opt/node22/bin/node /workspace/ns-upgrade/bin/cli.js \\"
    echo "    --output $OUTPUT_FILE --skip-workspace-scan"
    echo ""
    exit 1
fi

echo "✓ Output file found: $OUTPUT_FILE"
echo ""

# Display file info
echo "📊 File Information:"
# Use different stat commands based on availability
FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || wc -c < "$OUTPUT_FILE")
echo "  Size: $FILE_SIZE bytes"
echo "  Location: $OUTPUT_FILE"
echo ""

# Validate JSON structure using the validation script
echo "🔍 Validating JSON structure..."
# Use Node 22 for validation to ensure compatibility
/opt/node22/bin/node /workspace/scripts/validate-output.js "$OUTPUT_FILE"
VALIDATION_RESULT=$?

echo ""

if [ $VALIDATION_RESULT -eq 0 ]; then
    echo "✅ Validation PASSED!"
    echo ""

    # Show summary from discovery file
    echo "📋 Discovery Summary:"
    /opt/node22/bin/node -p "
        try {
            const data = require('$OUTPUT_FILE');
            let summary = '';
            if (data.projectInfo) {
                const info = data.projectInfo;
                if (info.currentNodeVersion) {
                    summary += '  Node.js Version: ' + (info.currentNodeVersion.detected || 'N/A') + '\n';
                }
                if (info.packageManager) {
                    summary += '  Package Manager: ' + (info.packageManager.name || 'N/A') + '\n';
                }
                if (info.environments) {
                    summary += '  OS: ' + (info.environments.productionOS || 'N/A') + '\n';
                }
                if (info.monorepoTools && info.monorepoTools.length > 0) {
                    summary += '  Monorepo Tools: ' + info.monorepoTools.join(', ') + '\n';
                }
            }
            if (data.scannedData && data.scannedData.packageJson && data.scannedData.packageJson.content && data.scannedData.packageJson.content.dependencies) {
                summary += '  Dependencies Found: ' + (Object.keys(data.scannedData.packageJson.content.dependencies).length || 0) + '\n';
            }
            summary;
        } catch (e) {
            '  (Could not parse summary: ' + e.message + ')';
        }
    " 2>/dev/null || echo "  (Could not parse summary)"

    echo ""

    # Copy results to mounted volume if available
    if [ -d "$RESULTS_DIR" ]; then
        mkdir -p "$RESULTS_DIR"
        cp "$OUTPUT_FILE" "$RESULTS_DIR/${SCENARIO_NAME}-discovery.json"
        echo "📄 Results copied to: $RESULTS_DIR/${SCENARIO_NAME}-discovery.json"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Test scenario complete!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    echo "❌ Validation FAILED!"
    echo ""
    echo "Check the output above for specific validation errors."
    echo ""
    exit 1
fi

exit 0
