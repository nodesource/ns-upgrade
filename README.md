<div align="center">
  <img src="assets/ns-logo.png" alt="NodeSource Logo" width="400"/>
</div>

# Node.js Upgrade Advisor

A command-line tool that analyzes your Node.js project to assess its upgrade readiness. This tool scans your environment, dependencies, and codebase to generate a comprehensive discovery report.

## Features

- **Automated Environment Detection**: Accurately detects your local Node.js version (even when run via `npx -p node@latest`), package manager, lockfiles, and CI/CD systems
- **Custom Dependency Discovery**: Automatically discovers package.json from git repos, GitHub, tarballs, and local files
- **Dependency Analysis**: Identifies C++ native modules and known addon dependencies
- **Monorepo Support**: Automatically discovers and scans all package.json files in workspace projects. Supports pnpm, Yarn, Lerna, Nx, and Turborepo. See [Monorepo Support](docs/MONOREPO_SUPPORT.md) for details.
- **Static API Analysis**: Uses ESLint to find deprecated Node.js APIs in your codebase
- **Interactive Wizard**: Simple prompts to gather project information
- **Comprehensive Report**: Generates a structured JSON file for further analysis
- **Styled Report Display**: Shows report summary and full JSON with syntax highlighting
- **Optional Report Submission**: Submit your report to NodeSource for a free pre-update assessment
- **Flexible Control**: CLI flags for different scanning modes (local-only, skip tarballs, etc.)

## Installation

### Recommended Method: Direct Execution (No Installation Required)

The tool is designed to be executed directly without formal installation using your preferred package runner. Choose the method that matches your workflow:

#### Using npx (npm)

```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade
```

#### Using pnpm dlx

```bash
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade
```

#### Using yarn dlx

```bash
yarn dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade
```

These commands automatically download and run the tool with the latest Node.js version, regardless of your system's current version.



## Usage

### Basic Usage

Navigate to your Node.js project root directory and run the tool using your preferred package runner:

**With npx:**
```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade
```

**With pnpm:**
```bash
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade
```

**With yarn:**
```bash
yarn dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade
```

The tool will:
1. Display the Terms of Service
2. Detect your local Node.js version
3. Ask you 6 questions about your project
4. Scan your environment and code
5. Generate `nodesource-discovery.json`
6. Display the report summary and full JSON content
7. Optionally submit the report to NodeSource for a free pre-update assessment

> **New to NodeSource?** Signing in happens in your browser. If you don't have an account yet, create one and verify your email address, then open the sign-in link again to continue.

### CLI Flags

#### `--version` or `-v`

Display the tool version:

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --version

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --version

# Using yarn
yarn dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --version
```

#### `--output` or `-o`

Specify a custom output file path:

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --output ./reports/discovery.json

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --output ./reports/discovery.json
```

#### `--exclude` or `-e`

Add custom directories or patterns to the exclusion list (can be used multiple times):

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --exclude vendor --exclude legacy

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --exclude vendor --exclude legacy
```

#### `--skip-workspace-scan`

Skip ALL custom dependency discovery:

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --skip-workspace-scan

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --skip-workspace-scan
```

By default, the tool aggressively discovers package.json from all custom dependency types:
- Local `file:` dependencies
- Git repositories (`git+ssh://`, `git+https://`, etc.)
- GitHub shorthand (`user/repo`)
- HTTP/HTTPS tarballs

Use this flag to skip all custom dependency discovery and scan only the root package.json.

**Scan time:** <1 second (fastest)

#### `--local-only`

Discover only local `file:` dependencies, skip all remote discovery:

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --local-only

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --local-only
```

**Discovers:**
- ✅ Local `file:` dependencies
- ❌ Skips git cloning
- ❌ Skips GitHub API calls
- ❌ Skips tarball downloads

**Scan time:** ~5-10 seconds

**Use when:**
- Network access is unavailable
- Running in offline environment
- git binary not installed
- Fast scan with local packages only

#### `--skip-tarballs`

Skip HTTP/HTTPS tarball downloads, but still discover git and GitHub dependencies:

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --skip-tarballs

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --skip-tarballs
```

**Discovers:**
- ✅ Local `file:` dependencies
- ✅ Git repositories
- ✅ GitHub shorthand
- ❌ Skips tarball downloads

**Scan time:** ~25-40 seconds

**Use when:**
- Bandwidth is limited
- Tarball sources are slow or unreliable
- Security concerns about downloads

#### `--log` or `-l`

Write a detailed log file containing all operations, timing information, and errors:

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log ./upgrade-log.txt

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log ./upgrade-log.txt
```

The log file includes:
- ✅ Detailed operation logs with timestamps
- ✅ Elapsed time for each operation
- ✅ All warnings and errors with stack traces
- ✅ Debug information for troubleshooting
- ✅ Complete execution flow

**Use when:**
- Debugging issues with the CLI
- Need detailed audit trail of operations
- Troubleshooting environment scanning problems
- Reporting issues to NodeSource support
- Need detailed audit trail of operations

#### `--max-files <number>`

Limit the maximum number of `package.json` files to scan (default: 100).

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --max-files 50

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --max-files 50
```

**Use when:**
- Scanning very large monorepos to prevent memory issues
- You only care about the first N packages

#### `--scan-depth <number>`

Limit the directory depth for file scanning (default: 5).

```bash
# Using npx
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --scan-depth 3

# Using pnpm
pnpm dlx -p node@latest -p @nodesource/upgrade nodesource-upgrade --scan-depth 3
```

**Use when:**
- You have a deep directory structure but only want to scan top-level packages
- Performance optimization for deep file trees

### Custom Dependency Discovery

By default (no flags), the tool discovers package.json from:

| Type | Example | Method |
|------|---------|--------|
| **node_modules** | _(any installed package)_ | Read from installed deps **(fastest!)** |
| **file:** | `file:./packages/api` | Filesystem read |
| **git+ssh://** | `git+ssh://git@github.com:user/repo.git` | Shallow clone (fallback) |
| **git+https://** | `git+https://github.com/user/repo.git` | Shallow clone (fallback) |
| **user/repo** | `lodash/lodash` | GitHub API (fallback) |
| **https://** | `https://cdn.com/pkg.tgz` | Download + extract (fallback) |

**Performance:**
- **With dependencies installed** (`npm install` run): ~5-15 seconds ✨
- **Without dependencies installed**: ~30-60 seconds

💡 **Pro Tip:** The tool first checks `node_modules/` before cloning repos or downloading tarballs, making scans **10-50x faster** when dependencies are already installed!

For complete documentation on custom dependency discovery, see `docs/DEPENDENCY_DISCOVERY.md`

## Interactive Questions

The tool will ask you the following questions:

1. **Current Node.js Version**: Confirm or select your current Node.js version (the tool detects this automatically, but you can override it)
   - Includes all LTS versions from Node.js 4 to 24
   - Option to specify a custom version
2. **Target Node.js LTS Version**: Choose between Node.js 20, 22, or 24
3. **Production OS**: Select one or more operating systems (Ubuntu, RHEL, Windows Server, macOS, etc.)
4. **Development OS**: Select your development operating system
5. **CI/CD System**: Choose your CI/CD platform (GitHub Actions, Jenkins, GitLab CI, etc.)
6. **Additional Notes**: Provide optional context about your project (max 500 characters)

## Report Display and Submission

After generating the report, the tool will:

### 1. Display Report Summary
Shows a high-level overview of your project including:
- Project information and current Node.js version
- Scanned data summary (package.json, lockfiles, workspaces)
- Static API analysis results
- Warnings and additional notes

### 2. Display Full JSON Content
Shows the complete JSON report that will be saved, with:
- **Syntax highlighting** for easy readability using marked-terminal
- **Lockfile content summarized** - Actual lockfile data is included in the saved file but displayed as a summary (e.g., `[Lockfile content omitted for display - 245 KB]`) to keep terminal output clean
- **Size information** showing the total size of the report

### 3. Optional Submission to NodeSource
After displaying the report, you'll be asked if you want to submit it to NodeSource for a **FREE pre-update assessment**:

**If you choose YES:**
- You'll be prompted to provide:
  - Your name
  - Your email address (with validation)
  - Company name
- The report will be submitted to NodeSource's upgrade advisory service
- You'll receive personalized recommendations for your upgrade

**If you choose NO:**
- The report is saved locally only
- You can submit it manually later if you change your mind

**Privacy Note:**
- Submission is completely optional
- You can review the exact content before deciding to submit
- The report is saved locally regardless of your submission choice

## Output

The tool generates a `nodesource-discovery.json` file with the following structure:

```json
{
  "schemaVersion": "1.2.0",
  "generatedAt": "2024-11-10T12:34:56.789Z",
  "projectInfo": {
    "currentNodeVersion": "v20.10.0",
    "targetLtsVersion": "20",
    "packageManager": {
      "name": "npm",
      "version": "10.0.0"
    },
    "environments": {
      "developmentOS": "macOS",
      "productionOS": "Ubuntu Linux",
      "ciEnvironment": "github"
    },
    "hasWorkspaces": false
  },
  "scannedData": {
    "packageJson": {
      "content": { /* full package.json content */ },
      "isTruncated": false
    },
    "allPackageJsons": [
      {
        "path": "packages/api/package.json",
        "content": { /* package.json content */ },
        "isTruncated": false,
        "isRoot": false,
        "sourceType": "file"
      },
      {
        "path": "git+ssh://git@github.com:company/auth.git",
        "content": { /* package.json content */ },
        "isTruncated": false,
        "isRoot": false,
        "sourceType": "git"
      },
      {
        "path": "github:lodash/lodash",
        "content": { /* package.json content */ },
        "isTruncated": false,
        "isRoot": false,
        "sourceType": "github-shorthand"
      }
    ],
    "lockfile": {
      "name": "package-lock.json",
      "content": "/* full lockfile content */",
      "isTruncated": false
    },
    "lockfilesDetected": ["package-lock.json"],
    "ciConfigsFound": [".github/workflows/ci.yml"],
    "cppAddons": {
      "gypFilesFound": [],
      "cmakeListsFound": [],
      "dependenciesFound": []
    }
  },
  "staticApiAnalysis": {
    "status": "success",
    "error": null,
    "findings": [
      {
        "api": "new Buffer()",
        "file": "src/utils.js",
        "line": 42
      }
    ]
  },
  "warnings": [],
  "additionalNotes": "Optional project context"
}
```

## Exit Codes

- **0**: Success - The scan completed successfully and the discovery file was generated
- **1**: Error - An error occurred during execution (missing package.json, permission issues, TOS not accepted, etc.)

## Error Messages

### Common Errors

- **"No package.json found"**: Run the tool from the root of your Node.js project
- **"package.json is malformed and cannot be parsed"**: Fix the JSON syntax in your package.json
- **"Cannot read package.json. Please check file permissions."**: Ensure you have read permissions
- **"Cannot write to current directory. Please check permissions."**: Ensure you have write permissions
- **"This tool requires Node.js 22 or higher"**: Use the recommended command with `node@latest` or upgrade your Node.js version

## System Requirements

- **Node.js**: 22.0.0 or higher
- **Package Runners**: npm (npx), pnpm, or yarn
- **Operating Systems**: Linux, macOS, Windows 10/11
- **Disk Space**: Minimal (output file is typically < 1MB)

## What the Tool Does

✅ **Scans**:
- Current Node.js version (using multi-strategy detection: **Volta**, **nvm**, **fnm**, **asdf**, **n**, system paths, bypassing npx environment)
- Package manager and version
- Lock files (pnpm-lock.yaml, yarn.lock, package-lock.json)
- package.json content (root and all discovered dependencies)
- Custom dependencies from git, GitHub, and tarballs
- CI/CD configuration files
- Native module dependencies (binding.gyp files)
- Deprecated Node.js APIs in your code

✅ **Generates**:
- Structured JSON report with all findings
- Complete dependency tree with package.json from custom sources
- Warnings for edge cases (truncated files, missing lockfiles, discovery failures)
- Styled report display with syntax highlighting
- Optional report submission to NodeSource upgrade advisory service

✅ **May Perform** (for custom dependency discovery):
- Git repository cloning (shallow, read-only)
- GitHub API requests (for public repos)
- HTTP/HTTPS tarball downloads (10MB limit)
- All with automatic cleanup and graceful error handling

❌ **Does NOT**:
- Modify any files in your project
- Install or update dependencies
- Execute any package code or install scripts
- Perform deep code analysis beyond ESLint patterns
- Store or upload data to external services

## Privacy & Security

**Data Privacy:**
- By default, the tool **does not upload** any data to NodeSource or external services
- All scanning happens locally on your machine
- After generating the report, you'll be **asked** if you want to submit it to NodeSource for a free pre-update assessment
- You can review the exact report content before deciding to submit
- Submission requires explicit consent and contact information (name, email, company)
- You control sharing of the generated `nodesource-discovery.json` file

**Network Activity:**
- May clone git repositories (when custom git dependencies detected)
- May fetch from GitHub API (when GitHub shorthand dependencies detected)
- May download tarballs (when tarball dependencies detected)
- Use `--local-only` flag for completely offline operation

**Security:**
- Only reads package.json files, never executes code
- All git clones and downloads use temporary directories with automatic cleanup
- 30-second timeouts prevent hangs
- 10MB size limit on tarball downloads
- Graceful error handling - failures don't stop the scan

## Architecture

The codebase is organized into modular components for maintainability:

### Core Modules (`lib/`)

**Organized by domain with single responsibility principle:**

- **`detectors/`** - Environment detection modules:
  - **`index.js`** - Main entry point exporting all detector functions
  - **`node-version.js`** - Orchestrates Node.js version detection across all strategies
  - **`version-managers/`** - Individual version manager detectors:
    - **`volta.js`** - Volta detection (~70 lines)
    - **`nvm.js`** - nvm detection (~86 lines)
    - **`fnm.js`** - fnm detection (~83 lines)
    - **`asdf.js`** - asdf detection (~84 lines)
    - **`n.js`** - n detection (~107 lines)
  - **`system-paths.js`** - System path detection for standard Node.js installations (~57 lines)
  - **`package-manager.js`** - Package manager detection (npm, yarn, pnpm) (~30 lines)
  - **`lockfiles.js`** - Lockfile detection and reading (~58 lines)
  - **`package-json.js`** - Package.json reading (~22 lines)
  - **`workspaces.js`** - Workspace configuration detection (~37 lines)

- **`scanner/`** - Project scanning and analysis modules:
  - **`index.js`** - Main scanning orchestrator coordinating all operations
  - **`dependency-detection.js`** - Logic to identify custom dependency sources (git, GitHub, tarballs, local files)
  - **`git-discovery.js`** - Git repository cloning and package.json discovery
  - **`http-discovery.js`** - HTTP/HTTPS operations for GitHub API and tarball downloads
  - **`file-scanners.js`** - File system scanning for CI configs, binding.gyp, and package.json files
  - **`package-readers.js`** - Package.json reading and custom dependency discovery orchestration
  - **`analyzer.js`** - Static API analysis using ESLint

- **`prompts/`** - Interactive CLI prompts modules
- **`output/`** - JSON report generation and file operations
- **`display.js`** - Styled report display with sections
- **`submit.js`** - Report submission to NodeSource with user prompts
- **`utils.js`** - Shared utility functions
- **`constants.js`** - Configuration constants and patterns
- **`schema.js`** - Output schema validation
- **`welcome.js`** - Welcome message and TOS acceptance

### Module Responsibilities

#### scanner/ (scanning system)
**Main scanning orchestrator and specialized scanners:**

- **index.js** - Entry point that orchestrates the entire scanning process by coordinating calls to all scanner modules

#### detectors/ (detection system)
**Organized by single responsibility principle for better maintainability:**

- **node-version.js** - Orchestrates Node.js version detection:
  - Detects when running under npx and bypasses its modified PATH
  - Checks version managers first (file-based detection)
  - Falls back to system paths and child process execution

- **version-managers/** - Individual version manager detectors:
  - **volta.js**: Reads `~/.volta/tools/user/platform.json` and project `package.json` volta pinning
  - **nvm.js**: Reads `~/.nvm/alias/default`, current symlink, and `NVM_BIN` environment variable
  - **fnm.js**: Reads `.node-version`, `.nvmrc`, `~/.fnm/aliases/default`, and `FNM_MULTISHELL_PATH` environment variable
  - **asdf.js**: Reads `.tool-versions` (project and global) for nodejs entries
  - **n.js**: Reads `$N_PREFIX/n/versions/node/` directory, `.n-node-version`, `.node-version`, and `N_NODE_PATH` environment variable

- **system-paths.js** - Checks common Node.js installation paths

- **package-manager.js** - Detects package manager (npm, yarn, pnpm) from lockfiles and environment

- **lockfiles.js** - Detects and reads lockfiles (pnpm-lock.yaml, yarn.lock, package-lock.json)

- **package-json.js** - Reads root package.json with truncation handling

- **workspaces.js** - Detects workspace configurations and custom dependencies

#### scanner/ modules

- **dependency-detection.js** - Identify custom dependency types (file:, git:, http:, GitHub shorthand), parse git URLs, and classify dependency sources

- **git-discovery.js** - Check git availability, execute commands with timeout, clone git repositories, and extract package.json from git repos

- **http-discovery.js** - Fetch from GitHub raw content API, download and extract tarballs, read from node_modules (optimization), and handle GitHub shorthand dependencies

- **file-scanners.js** - Scan for CI/CD config files, find binding.gyp files, discover C++ addons, and locate all package.json files

- **package-readers.js** - Read multiple package.json files with truncation handling, discover custom dependencies with configurable options

- **analyzer.js** - Build ESLint configurations for target Node.js versions, analyze code for deprecated APIs

#### output/ modules

- **index.js** - Main orchestrator for output generation with support for file, console, and buffer outputs

- **output-processor.js** - Data assembly and validation, schema enforcement

- **output-handlers.js** - Strategy pattern for different output types (file, console, buffer)

- **file-operations.js** - File system abstraction with dependency injection for testing

#### display and submission modules

- **display.js** - Styled report display using colorette for terminal output, shows summary sections for project info, scanned data, analysis results, and warnings

- **submit.js** - Report submission orchestration including:
  - Display raw JSON with syntax highlighting using marked-terminal
  - Lockfile content summarization for terminal display
  - User prompts for submission consent
  - User information collection (name, email, company) with validation
  - HTTP POST submission to NodeSource upgrade advisory API

## Testing & Code Coverage

Run the test suite with code coverage:

```bash
# If you have the repository cloned
pnpm test
```

This generates:
- **Console output** - Test results and coverage percentages
- **HTML report** - `coverage/index.html` for detailed visualization
- **LCOV report** - `coverage/lcov.info` for CI/CD integration

The coverage configuration is defined in `.nycrc.json` and includes:
- **Statements**: 80% threshold
- **Branches**: 80% threshold
- **Functions**: 80% threshold
- **Lines**: 80% threshold

## Contributing

Contributions are welcome! Please ensure:
- Code follows StandardJS style guidelines
- All tests pass with coverage: `pnpm test`
- New features include appropriate tests
- New modules follow the established separation of concerns

## License

MIT

## Support

For issues or questions, please contact your NodeSource representative.

---

**Ready to upgrade?** Run the tool and share your discovery report with NodeSource to begin your modernization journey!
