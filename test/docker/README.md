# Docker Testing for ns-upgrade

Test the ns-upgrade CLI across different Node.js environments.

---

## Available Test Scenarios

| Scenario | System Node | Version Manager | Managed Node | Status |
|----------|-------------|-----------------|--------------|--------|
| **node8-system** | 8.17.0 | None | - | ✅ Ready |
| **node8-ghost** | 8.17.0 | None | - | ✅ Ready |
| **node10-volta-node12** | 10.x | Volta | 12.22.12 | ✅ Ready |
| **node12-nvm-node14** | 12.x | NVM | 14.21.3 | ✅ Ready |
| **node13-system** | 13.14.0 | None | - | ✅ Ready |
| **node16-fnm-node18** | 16.x | FNM | 18.20.0 | ✅ Ready |
| **node20-system** | 20.x | None | - | ✅ Ready |

---

## Quick Start

### 1. Build All Scenarios

```bash
./test/docker/scripts/build-all.sh
```

**Build time**:
- **First build**: ~15-20 minutes (builds base image + all scenarios)
- **Subsequent builds**: ~5 minutes (reuses cached base image)

### 2. Test a Scenario

```bash
# Pick a scenario name from the table above
./test/docker/scripts/test-scenario-interactive.sh <scenario-name>

# Examples:
./test/docker/scripts/test-scenario-interactive.sh node8-system
./test/docker/scripts/test-scenario-interactive.sh node13-system
./test/docker/scripts/test-scenario-interactive.sh node16-fnm-node18
./test/docker/scripts/test-scenario-interactive.sh node20-system
```

### 3. Inside the Container

The container will automatically show instructions. Follow these steps:

```bash
# 1. Run ns-upgrade (copy/paste this command)
/opt/node22/bin/node /workspace/ns-upgrade/bin/cli.js \
  --output /workspace/demo-app/discovery.json --skip-workspace-scan

# 2. Answer the prompts:
#    - Accept Terms of Service (y)
#    - Confirm Node.js version
#    - Answer questionnaire

# 3. Validate results
/workspace/validate-results.sh

# 4. Exit container
exit
```

Results will be saved to: `test/docker/results/<scenario>-discovery.json`

---

## Why Semi-Automated?

The ns-upgrade CLI is **interactive by design** - it requires:
- Terms of Service acceptance
- Node.js version confirmation
- User questionnaire responses

Therefore, testing requires:
1. **Automated**: Build containers & validate output
2. **Manual**: Run CLI & answer prompts

---

## Files Structure

```
test/docker/
├── README.md                          # This file
├── QUICK_START.md                     # Quick reference guide
├── KNOWN_ISSUES.md                    # Troubleshooting guide
├── base/
│   └── Dockerfile.base                # Base image (Node 22 + ns-upgrade)
├── scripts/
│   ├── build-all.sh                   # Build base + all scenarios
│   ├── test-scenario-interactive.sh   # Launch interactive test
│   ├── info.sh                        # Shared: Show instructions
│   ├── validate.sh                    # Shared: Validate results
│   └── validate-output.js             # Shared: JSON validation
├── scenarios/
│   ├── node8-system/
│   │   ├── Dockerfile                 # Scenario-specific setup
│   │   └── demo-app/                  # Test application
│   ├── node10-volta-node12/
│   ├── node12-nvm-node14/
│   ├── node13-system/
│   ├── node16-fnm-node18/
│   └── node20-system/
└── results/                           # Output JSON files (created automatically)
```

---

## What Gets Tested

Each scenario verifies:

✅ **Environment Detection**
- Correct Node.js version detected (system vs version manager)
- Package manager identified (npm/yarn/pnpm)
- Operating system detected
- Version manager detected (NVM/Volta/FNM)

✅ **Dependency Analysis**
- Regular dependencies (outdated packages)
- Local packages (`file:` protocol)
- Git dependencies (`github:` protocol)
- Native modules

✅ **Output Validation**
- JSON structure correct
- Required fields present
- Data types valid

---

## Troubleshooting

### Container exits immediately

Use the interactive script:
```bash
./test/docker/scripts/test-scenario-interactive.sh <scenario-name>
```

### Command not found errors

Ensure you're in the project root:
```bash
cd ~/NodeSource/ns-upgrade
```

### Build failures

Check Docker is running:
```bash
docker ps
```

Rebuild from scratch:
```bash
docker build --no-cache -t ns-upgrade-test-<scenario> \
  -f test/docker/scenarios/<scenario>/Dockerfile .
```

### More issues

See `KNOWN_ISSUES.md` for detailed troubleshooting.

---

## Technical Details

### Architecture Overview

**Base Image** (`ns-upgrade-test-base`):
- Ubuntu 20.04 + build tools
- Node.js 22.21.1 at `/opt/node22/`
- ns-upgrade project pre-installed
- Shared scripts (info.sh, validate.sh)

**Scenario Images** (built from base):
- Install test Node version (8, 10, 12, 13, 16, or 20)
- Install version manager if needed (Volta, NVM, FNM)
- Copy and setup demo application
- Only ~30-50 lines per Dockerfile

### How Node 22 is Used

The CLI requires Node.js 22+, but we test with older versions. Solution:

- **Demo app**: Uses test Node version (8, 10, 12, 13, 16, or 20)
- **ns-upgrade CLI**: Runs with Node 22 from `/opt/node22/` (pre-installed in base)
- **Detection**: CLI correctly detects the demo app's Node version

### Command Structure

```bash
/opt/node22/bin/node              # Execute with Node 22
/workspace/ns-upgrade/bin/cli.js  # ns-upgrade CLI
--output /workspace/demo-app/discovery.json  # Output file
--skip-workspace-scan             # Skip workspace scanning
```

---

## Adding Scenarios

To add a new scenario:

1. Create directory: `scenarios/new-scenario/`
2. Create `Dockerfile` starting with `FROM ns-upgrade-test-base:latest`
3. Install test Node version and version manager (if needed)
4. Add demo app in `scenarios/new-scenario/demo-app/`
5. Set `SCENARIO_NAME` and `VERSION_MANAGER` environment variables
6. Update `SCENARIOS` array in `build-all.sh`

**Note**: Scripts (info.sh, validate.sh) are shared and pre-installed in the base image.

---
