# Quick Start Guide

## Build All Scenarios (First Time Only)

```bash
./test/docker/scripts/build-all.sh
```

**Build Process:**
1. Builds base image (`ns-upgrade-test-base`) with Node 22 + ns-upgrade
2. Builds all 6 test scenarios (reusing the base image)

**Time:** ~15-20 minutes first time, ~5 minutes after (cached)

---

## Test a Scenario

### Available Scenarios:
- `node8-system`
- `node10-volta-node12`
- `node12-nvm-node14`
- `node13-system`
- `node16-fnm-node18`
- `node20-system`

### Run Interactive Test:

```bash
./test/docker/scripts/test-scenario-interactive.sh <scenario-name>
```

**Example:**
```bash
./test/docker/scripts/test-scenario-interactive.sh node16-fnm-node18
```

---

## Inside Container

The container shows instructions automatically. Run these commands:

### Step 1: Run ns-upgrade
```bash
/opt/node22/bin/node /workspace/ns-upgrade/bin/cli.js \
  --output /workspace/demo-app/discovery.json --skip-workspace-scan
```

### Step 2: Answer Prompts
- Accept TOS: `y`
- Confirm Node version
- Answer questions

### Step 3: Validate
```bash
/workspace/validate-results.sh
```

### Step 4: Exit
```bash
exit
```

---

## Results

Find output here:
```
test/docker/results/<scenario>-discovery.json
```

---

## Common Issues

**Wrong scenario name?**
Use exact names from the list above (e.g., `node16-fnm-node18`, not `node10-fnm-node-18`)

**Build failed?**
Make sure Docker is running: `docker ps`

**Need help?**
See `README.md`
