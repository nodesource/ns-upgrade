# Monorepo Support

The Node.js Upgrade Advisor includes comprehensive support for detecting and analyzing monorepo environments. This ensures that complex project structures are correctly identified and that relevant configuration details are captured for the upgrade assessment.

## Supported Tools

The CLI automatically detects the following monorepo tools and build systems by checking for their specific configuration files:

| Tool | Configuration Files Detected |
|------|------------------------------|
| **pnpm Workspaces** | `pnpm-workspace.yaml` |
| **Lerna** | `lerna.json` |
| **Nx** | `nx.json` |
| **Turborepo** | `turbo.json` |
| **Yarn** | `.yarnrc.yml`, `.yarnrc` |

## Detection Logic

The detection process works as follows:

1.  **Package.json Check**: The tool first checks the root `package.json` for a `workspaces` field, which is standard for npm, Yarn, and pnpm workspaces.
2.  **Configuration File Scan**: It scans the project root for the configuration files listed above.
3.  **Exhaustive Discovery**: Even if one tool is found, the scanner continues to check for others to support hybrid setups (e.g., Lerna with Nx, or pnpm with Turborepo).

## Data Collection

When a monorepo configuration is detected:

- **Tool Identification**: The specific tools in use are listed in the `projectInfo.monorepoTools` field of the report.
- **Configuration Capture**: The content of the detected configuration files is read and included in the `scannedData.monorepoConfigs` section of the JSON report. This provides context on how the workspace is structured, which is critical for understanding dependency management and build processes during an upgrade.

## Benefits

- **Accurate Context**: Helps the upgrade advisor understand that multiple `package.json` files belong to a single logical project.
- **Build System Awareness**: Identifying tools like Nx or Bazel alerts the advisor to potential build-time constraints or specific upgrade requirements associated with those systems.
- **Configuration Insights**: Capturing config files allows for a deeper analysis of workspace settings that might conflict with newer Node.js versions.
