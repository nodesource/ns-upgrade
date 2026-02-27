# Detectors System Architecture

## System Overview

The detectors system is responsible for environment and project detection capabilities in the Node.js upgrade analysis tool. It identifies Node.js versions from various sources, detects package managers, analyzes lockfiles, reads package configurations, and identifies workspace setups. The system provides the foundational environment context that enables the scanner and analyzer modules to perform their specialized tasks.

## Directory Structure

The detectors system is organized in the `lib/detectors/` directory with the following structure:

```
lib/detectors/
├── index.js                    # Main entry point and public API
├── lockfiles.js                # Lockfile detection and parsing
├── node-version.js             # Node.js version detection
├── package-json.js             # Package.json reading utilities
├── package-manager.js          # Package manager identification
├── system-paths.js             # System path detection and resolution
├── workspaces.js               # Workspace configuration detection
└── version-managers/           # Version manager detection subdirectory
    ├── asdf.js                 # ASDF version manager
    ├── fnm.js                  # Fast Node Manager (FNM)
    ├── n.js                    # N version manager
    ├── nvm.js                  # Node Version Manager (NVM)
    └── volta.js                # Volta version manager
```

### Import Patterns

```javascript
// Main API - import the orchestrator
const {
  detectNodeVersion,
  detectPackageManager,
  detectLockfiles,
  readPackageJson,
  readLockfile,
  detectWorkspaces
} = require('../lib/detectors')

// Individual modules - for testing or advanced usage
const { detectNodeVersionFromNvm } = require('../lib/detectors/version-managers/nvm')
const { detectPackageManagerFromFiles } = require('../lib/detectors/package-manager')
const { parseLockfile } = require('../lib/detectors/lockfiles')
```

## Core Architecture

### Modular Design Pattern

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/detectors/   │───▶│lib/detectors/    │    │ Version Managers │
│   index.js      │    │version-managers/ │    │ (NVM, FNM, etc.) │
│  (Entry Point)  │    │   (Sub-modules)  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/detectors/   │    │lib/detectors/    │    │ File System     │
│node-version.js  │    │package-manager.  │    │ (package.json,  │
│                 │    │      js          │    │  lockfiles)     │
│ (Version Detect)│    │ (Manager Detect) │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Module Responsibilities

### 1. `lib/detectors/index.js` - Main Entry Point

**Technical Implementation:**
- Central export point for all detector functions
- Provides clean public API surface
- Organizes imports from sub-modules
- Maintains backward compatibility

**Exported Functions:**
```javascript
module.exports = {
  // Node.js version detection
  detectNodeVersion,

  // Package manager detection
  detectPackageManager,

  // Lockfile operations
  detectLockfiles,
  readLockfile,

  // Package file operations
  readPackageJson,

  // Workspace detection
  detectWorkspaces
}
```

**Usage Pattern:**
```javascript
// Simple import of all detection capabilities
const detectors = require('../lib/detectors')

// Use individual detection functions
const nodeVersion = detectors.detectNodeVersion()
const packageManager = detectors.detectPackageManager()
const lockfiles = detectors.detectLockfiles()
```

### 2. `lib/detectors/node-version.js` - Node.js Version Detection

**Technical Implementation:**
- Multi-source version detection strategy
- Version manager integration
- System PATH resolution
- Semantic version parsing and validation

**Core Functions:**
```javascript
function detectNodeVersion() -> string
function parseNodeVersion(versionString) -> SemanticVersion
```

**Detection Priority Order:**
```javascript
function detectNodeVersion() {
  // 1. Check version managers (highest priority)
  const versionManagerVersion = detectFromVersionManagers()
  if (versionManagerVersion) return versionManagerVersion

  // 2. Check system PATH
  const systemVersion = detectFromSystemPath()
  if (systemVersion) return systemVersion

  // 3. Check current running Node.js
  const runningVersion = process.version
  if (runningVersion) return runningVersion

  // 4. Return unknown if nothing detected
  return 'unknown'
}
```

**Version Manager Integration:**
```javascript
function detectFromVersionManagers() {
  const managers = [
    detectNodeVersionFromNvm,
    detectNodeVersionFromFnm,
    detectNodeVersionFromAsdf,
    detectNodeVersionFromN,
    detectNodeVersionFromVolta
  ]

  for (const detectVersion of managers) {
    try {
      const version = detectVersion()
      if (version && version !== 'unknown') {
        return version
      }
    } catch (error) {
      // Continue to next manager
    }
  }

  return null
}
```

**Version Parsing:**
```javascript
function parseNodeVersion(versionString) {
  // Handle various version formats:
  // - "v20.10.0" -> { major: 20, minor: 10, patch: 0 }
  // - "20.10.0" -> { major: 20, minor: 10, patch: 0 }
  // - "20" -> { major: 20, minor: 0, patch: 0 }

  const cleanVersion = versionString.replace(/^v/, '')
  const parts = cleanVersion.split('.').map(Number)

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    raw: versionString
  }
}
```

### 3. `lib/detectors/package-manager.js` - Package Manager Detection

**Technical Implementation:**
- File-based detection strategy
- Configuration file analysis
- Command availability checking
- Version extraction from multiple sources

**Core Functions:**
```javascript
function detectPackageManager() -> PackageManagerInfo
function detectPackageManagerFromFiles() -> PackageManagerInfo
function detectPackageManagerFromCommands() -> PackageManagerInfo
```

**Detection Strategy:**
```javascript
function detectPackageManager() {
  // 1. File-based detection (most reliable)
  const fileBased = detectPackageManagerFromFiles()
  if (fileBased.name !== 'unknown') return fileBased

  // 2. Command availability detection
  const commandBased = detectPackageManagerFromCommands()
  if (commandBased.name !== 'unknown') return commandBased

  // 3. Default to npm (always available with Node.js)
  return { name: 'npm', version: 'builtin' }
}
```

**File-Based Detection:**
```javascript
function detectPackageManagerFromFiles() {
  const files = [
    { name: 'package-lock.json', manager: 'npm' },
    { name: 'yarn.lock', manager: 'yarn' },
    { name: 'pnpm-lock.yaml', manager: 'pnpm' },
    { name: 'pnpm-lock.yml', manager: 'pnpm' },
    { name: 'bun.lockb', manager: 'bun' },
    { name: 'bun.lock', manager: 'bun' }
  ]

  for (const file of files) {
    if (fileExists(file.name)) {
      const version = extractVersionFromLockfile(file.name, file.manager)
      return { name: file.manager, version, source: 'lockfile' }
    }
  }

  return { name: 'unknown', version: null }
}
```

**Command Detection:**
```javascript
function detectPackageManagerFromCommands() {
  const commands = [
    { cmd: 'npm --version', manager: 'npm' },
    { cmd: 'yarn --version', manager: 'yarn' },
    { cmd: 'pnpm --version', manager: 'pnpm' },
    { cmd: 'bun --version', manager: 'bun' }
  ]

  for (const { cmd, manager } of commands) {
    try {
      const version = execSync(cmd, { encoding: 'utf8' }).trim()
      if (version) {
        return { name: manager, version, source: 'command' }
      }
    } catch (error) {
      // Command not available
    }
  }

  return { name: 'unknown', version: null }
}
```

### 4. `lib/detectors/lockfiles.js` - Lockfile Detection and Parsing

**Technical Implementation:**
- Multi-format lockfile support
- Content parsing and validation
- Dependency extraction
- Version resolution from lockfiles

**Core Functions:**
```javascript
function detectLockfiles() -> LockfileInfo[]
function readLockfile(lockfiles) -> LockfileContent
function parseLockfile(filePath, format) -> ParsedLockfile
```

**Supported Lockfile Formats:**
```javascript
const SUPPORTED_LOCKFILES = {
  'package-lock.json': {
    format: 'npm',
    parser: parseNpmLockfile,
    versionExtractor: extractNpmVersion
  },
  'yarn.lock': {
    format: 'yarn',
    parser: parseYarnLockfile,
    versionExtractor: extractYarnVersion
  },
  'pnpm-lock.yaml': {
    format: 'pnpm',
    parser: parsePnpmLockfile,
    versionExtractor: extractPnpmVersion
  },
  'bun.lockb': {
    format: 'bun',
    parser: parseBunLockfile,
    versionExtractor: extractBunVersion
  }
}
```

**Lockfile Detection:**
```javascript
function detectLockfiles() {
  const detected = []

  for (const [filename, config] of Object.entries(SUPPORTED_LOCKFILES)) {
    if (fileExists(filename)) {
      detected.push({
        name: filename,
        format: config.format,
        path: resolvePath(filename),
        size: getFileSize(filename)
      })
    }
  }

  return detected
}
```

**Lockfile Parsing:**
```javascript
function readLockfile(lockfiles) {
  if (!lockfiles || lockfiles.length === 0) {
    return { name: null, content: null, isTruncated: false }
  }

  // Use first detected lockfile (priority order matters)
  const selectedLockfile = lockfiles[0]
  const config = SUPPORTED_LOCKFILES[selectedLockfile.name]

  try {
    const content = readFileSync(selectedLockfile.path, 'utf8')
    const parsed = config.parser(content)

    return {
      name: selectedLockfile.name,
      content: parsed,
      isTruncated: false,
      format: config.format
    }
  } catch (error) {
    return {
      name: selectedLockfile.name,
      content: null,
      isTruncated: true,
      error: error.message
    }
  }
}
```

### 5. `lib/detectors/package-json.js` - Package.json Operations

**Technical Implementation:**
- Safe package.json reading
- Content validation and normalization
- Error handling for malformed files
- Path resolution utilities

**Core Functions:**
```javascript
function readPackageJson(customPath) -> PackageJsonInfo
function validatePackageJson(content) -> ValidationResult
```

**Package.json Reading:**
```javascript
function readPackageJson(customPath = null) {
  const packagePath = customPath || 'package.json'

  try {
    // Check if file exists
    if (!fileExists(packagePath)) {
      throw new Error(`package.json not found at ${packagePath}`)
    }

    // Read and parse content
    const content = readFileSync(packagePath, 'utf8')
    const parsed = JSON.parse(content)

    // Validate basic structure
    const validation = validatePackageJson(parsed)
    if (!validation.isValid) {
      throw new Error(`Invalid package.json: ${validation.errors.join(', ')}`)
    }

    return {
      content: parsed,
      path: resolvePath(packagePath),
      isTruncated: false,
      size: content.length
    }
  } catch (error) {
    return {
      content: null,
      path: packagePath,
      isTruncated: true,
      error: error.message
    }
  }
}
```

**Content Validation:**
```javascript
function validatePackageJson(content) {
  const errors = []

  // Required fields
  if (!content.name) errors.push('Missing required field: name')
  if (!content.version) errors.push('Missing required field: version')

  // Version format validation
  if (content.version && !isValidSemver(content.version)) {
    errors.push('Invalid version format')
  }

  // Name format validation
  if (content.name && !isValidPackageName(content.name)) {
    errors.push('Invalid package name format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### 6. `lib/detectors/system-paths.js` - System Path Detection

**Technical Implementation:**
- Environment variable parsing
- PATH resolution and validation
- Directory existence checking
- Cross-platform path handling

**Core Functions:**
```javascript
function resolveSystemPath(pathVar) -> ResolvedPath
function checkDirectoryExists(path) -> boolean
function expandEnvironmentVariables(path) -> string
```

**PATH Resolution:**
```javascript
function resolveSystemPath(pathVar = 'PATH') {
  const pathValue = process.env[pathVar]
  if (!pathValue) return []

  return pathValue
    .split(path.delimiter)
    .map(expandEnvironmentVariables)
    .filter(checkDirectoryExists)
    .map(resolveAbsolutePath)
}
```

**Environment Variable Expansion:**
```javascript
function expandEnvironmentVariables(path) {
  return path.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
    return process.env[varName] || match
  })
}
```

### 7. `lib/detectors/workspaces.js` - Workspace Detection

**Technical Implementation:**
- Multiple workspace format support
- Configuration analysis
- Package relationship mapping
- Monorepo structure identification

**Core Functions:**
```javascript
function detectWorkspaces(packageJson) -> WorkspaceInfo
function parseWorkspaceConfig(config) -> WorkspaceConfig
function findWorkspacePackages(config) -> PackageInfo[]
```

**Workspace Detection:**
```javascript
function detectWorkspaces(packageJson) {
  if (!packageJson || !packageJson.content) {
    return { hasWorkspaces: false, config: null, packages: [] }
  }

  const { content } = packageJson

  // Check for explicit workspaces configuration
  if (content.workspaces) {
    const workspaceConfig = parseWorkspaceConfig(content.workspaces)
    const packages = findWorkspacePackages(workspaceConfig)

    return {
      hasWorkspaces: true,
      config: workspaceConfig,
      packages,
      type: 'explicit'
    }
  }

  // Check for implicit workspace indicators
  const implicitWorkspaces = detectImplicitWorkspaces(content)
  if (implicitWorkspaces.length > 0) {
    return {
      hasWorkspaces: true,
      config: { type: 'implicit', packages: implicitWorkspaces },
      packages: implicitWorkspaces,
      type: 'implicit'
    }
  }

  return { hasWorkspaces: false, config: null, packages: [] }
}
```

**Workspace Configuration Parsing:**
```javascript
function parseWorkspaceConfig(workspaces) {
  if (Array.isArray(workspaces)) {
    return {
      type: 'array',
      patterns: workspaces,
      packages: []
    }
  }

  if (typeof workspaces === 'object' && workspaces.packages) {
    return {
      type: 'object',
      patterns: workspaces.packages,
      packages: workspaces.nohoist || []
    }
  }

  return { type: 'unknown', patterns: [], packages: [] }
}
```

### 8. Version Managers Subdirectory

Each version manager follows a consistent pattern for detection:

#### `lib/detectors/version-managers/nvm.js` - NVM Detection

**Core Functions:**
```javascript
function detectNodeVersionFromNvm() -> string
function getNvmDir() -> string
function getCurrentNvmVersion() -> string
```

**Detection Logic:**
```javascript
function detectNodeVersionFromNvm() {
  // 1. Check NVM_DIR environment variable
  const nvmDir = getNvmDir()
  if (!nvmDir) return null

  // 2. Check .nvmrc file
  const nvmrcVersion = getCurrentNvmVersion()
  if (nvmrcVersion) return nvmrcVersion

  // 3. Check NVM current version
  const currentVersion = getNvmCurrentVersion()
  if (currentVersion) return currentVersion

  return null
}
```

#### `lib/detectors/version-managers/fnm.js` - FNM Detection

**Core Functions:**
```javascript
function detectNodeVersionFromFnm() -> string
function getFnmDir() -> string
function getFnmCurrentVersion() -> string
```

**Detection Logic:**
```javascript
function detectNodeVersionFromFnm() {
  // 1. Check FNM_DIR environment variable
  // 2. Check .node-version file
  // 3. Check FNM current version via command
  // 4. Check FNM_MULTISHELL_PATH environment variable
}
```

#### Other Version Managers

The same pattern applies to:
- **ASDF**: `.tool-versions` file and `ASDF_DIR` detection
- **N**: `N_PREFIX` directory and `.n-version` file detection
- **Volta**: Package.json `volta` field and `VOLTA_HOME` detection

## Data Flow Architecture

### Detection Processing Pipeline

```
Input: { customPath, options }
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Package.json Reading                                  │
│    - Locate and read package.json                        │
│    - Validate JSON structure and required fields        │
│    - Extract basic project information                   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Node.js Version Detection                             │
│    - Check version managers in priority order           │
│    - Parse and validate version strings                  │
│    - Fall back to system PATH and running version        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Package Manager Detection                             │
│    - Analyze lockfiles for reliable detection           │
│    - Check command availability as fallback              │
│    - Extract version information                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Lockfile Analysis                                     │
│    - Detect all supported lockfile formats               │
│    - Parse lockfile content and dependencies             │
│    - Select primary lockfile for processing              │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Workspace Detection                                   │
│    - Check explicit workspace configurations             │
│    - Identify implicit workspace patterns                │
│    - Map workspace packages and relationships            │
└─────────────────────────────────────────────────────────┘
         │
         ▼
Output: { nodeVersion, packageManager, lockfiles, packageJson, workspaces }
```

### Version Manager Detection Strategy

**Priority Order:**
1. **Environment Variables** - NVM_DIR, FNM_DIR, ASDF_DIR, etc.
2. **Configuration Files** - .nvmrc, .node-version, .tool-versions
3. **Current Version Commands** - `nvm current`, `fnm current`, etc.
4. **Installation Directories** - Version manager installation paths
5. **System PATH** - Fallback to system-installed Node.js

**Error Handling:**
- Graceful fallback when version managers are not available
- Safe handling of missing configuration files
- Timeout protection for command execution
- Clear error messages for debugging

## Error Handling Strategy

### Layered Error Handling

```javascript
// Individual Detector Functions
function detectNodeVersion() {
  try {
    // Detection logic
  } catch (error) {
    return 'unknown' // Safe fallback
  }
}

// File Operations
function readPackageJson(path) {
  try {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    return { content: null, error: error.message, isTruncated: true }
  }
}

// Command Execution
function detectPackageManagerFromCommands() {
  for (const command of commands) {
    try {
      const version = execSync(command.cmd, { encoding: 'utf8' })
      return { name: command.manager, version: version.trim() }
    } catch (error) {
      // Continue to next command
    }
  }
  return { name: 'unknown', version: null }
}
```

### Error Categories
1. **File System Errors**: Missing files, permission issues, corrupted JSON
2. **Command Errors**: Version managers not installed, command failures
3. **Parse Errors**: Malformed configuration files, invalid versions
4. **Environment Errors**: Missing environment variables, invalid paths
5. **Network Errors**: Remote version manager operations (rare)

## Performance Characteristics

### Detection Speed by Component

| Component | Method | Typical Speed | Notes |
|-----------|--------|---------------|-------|
| package.json | File read | <1ms | Always executed |
| Node.js version | Manager check | 1-5ms | Depends on managers |
| Package manager | File scan | <1ms | Lockfile detection |
| Lockfiles | Parse content | 1-10ms | Size dependent |
| Workspaces | Glob pattern | 5-50ms | Project size dependent |

### Memory Usage
- **Minimal Footprint**: Only reads necessary files
- **Streaming Parsing**: Large lockfiles parsed incrementally
- **Temporary Storage**: Results aggregated before return
- **No Caching**: Fresh detection on each call

### Optimization Strategies
- **Early Returns**: Stop detection when first reliable source found
- **Lazy Loading**: Version managers checked only when needed
- **Parallel Safe**: All operations are synchronous and thread-safe
- **Error Bypass**: Fast failure when sources are unavailable

## Integration Points

### External Dependencies
- **Node.js fs module**: File system operations
- **Node.js child_process**: Command execution for version detection
- **Node.js path module**: Cross-platform path handling
- **Node.js process module**: Environment variable access

### API Surface

```javascript
// Primary detection API
function detectNodeVersion() -> string
function detectPackageManager() -> PackageManagerInfo
function detectLockfiles() -> LockfileInfo[]
function readPackageJson(customPath) -> PackageJsonInfo
function readLockfile(lockfiles) -> LockfileContent
function detectWorkspaces(packageJson) -> WorkspaceInfo

// Version manager specific APIs (exported for testing)
function detectNodeVersionFromNvm() -> string
function detectNodeVersionFromFnm() -> string
function detectNodeVersionFromAsdf() -> string
function detectNodeVersionFromN() -> string
function detectNodeVersionFromVolta() -> string
```

### Data Contracts

```typescript
interface PackageManagerInfo {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown'
  version: string | null
  source: 'lockfile' | 'command' | 'builtin'
}

interface LockfileInfo {
  name: string
  format: 'npm' | 'yarn' | 'pnpm' | 'bun'
  path: string
  size: number
}

interface PackageJsonInfo {
  content: object | null
  path: string
  isTruncated: boolean
  error?: string
}

interface WorkspaceInfo {
  hasWorkspaces: boolean
  config: WorkspaceConfig | null
  packages: PackageInfo[]
  type: 'explicit' | 'implicit' | 'none'
}
```

## Testing Architecture

### Test Strategy by Module

1. **index.js**: Export validation and API surface testing
2. **node-version.js**: Version detection across all managers
3. **package-manager.js**: Manager detection and version extraction
4. **lockfiles.js**: Lockfile parsing for all supported formats
5. **package-json.js**: File reading and validation testing
6. **system-paths.js**: Path resolution and environment handling
7. **workspaces.js**: Workspace configuration detection
8. **version-managers/**: Individual version manager testing

### Mock Implementation Pattern

```javascript
// File system mock
const mockFs = {
  existsSync: (path) => mockFileExists[path],
  readFileSync: (path) => mockFileContent[path],
  statSync: (path) => ({ size: mockFileSize[path] })
}

// Process mock for environment variables
const mockProcess = {
  env: {
    NVM_DIR: '/mock/nvm',
    PATH: '/mock/bin:/usr/bin',
    FNM_MULTISHELL_PATH: '/mock/fnm/current'
  }
}

// Child process mock for command execution
const mockChildProcess = {
  execSync: (command, options) => {
    if (command.includes('npm --version')) return '8.0.0'
    if (command.includes('nvm current')) return 'v18.17.0'
    throw new Error('Command not found')
  }
}
```

### Test Coverage Areas
- **Happy Path**: Normal detection across all components
- **Error Conditions**: Missing files, broken installations, malformed configs
- **Edge Cases**: Empty projects, multiple managers, conflicting configurations
- **Version Managers**: All supported managers with various configurations
- **Cross-Platform**: Windows, macOS, Linux path handling
- **Performance**: Timeout handling, large file processing

This architecture provides a reliable, comprehensive, and maintainable foundation for environment detection in the Node.js upgrade analysis tool, supporting all major version managers and package managers across different platforms.
