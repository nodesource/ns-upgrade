# Scanner System Architecture

## System Overview

The scanner system is responsible for comprehensive project analysis and dependency discovery in the Node.js upgrade analysis tool. It performs deep scanning of project structures, discovers custom dependencies from various sources (git, GitHub, tarballs, local files), analyzes CI/CD configurations, and collects all relevant package.json files for complete dependency tree visibility.

## Directory Structure

The scanner system is organized in the `lib/scanner/` directory with the following structure:

```
lib/scanner/
├── index.js                 # Main orchestrator and public API
├── analyzer.js              # ESLint-based static API analysis
├── dependency-detection.js  # Custom dependency type detection
├── file-scanners.js         # File system scanning utilities
├── git-discovery.js         # Git repository discovery and cloning
├── http-discovery.js        # HTTP-based discovery (GitHub, tarballs)
└── package-readers.js       # Package.json reading and processing
```

### Import Patterns

```javascript
// Main API - import the orchestrator
const { scan, buildEslintConfig } = require('../lib/scanner')

// Individual modules - for testing or advanced usage
const { detectCustomDependency, parseGitUrl } = require('../lib/scanner/dependency-detection')
const { discoverGitDependency } = require('../lib/scanner/git-discovery')
const { discoverGitHubShorthand, discoverTarballDependency } = require('../lib/scanner/http-discovery')
const { scanCiConfigs, discoverAllPackageJsonFiles } = require('../lib/scanner/file-scanners')
```

## Core Architecture

### Modular Design Pattern

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/scanner/     │───▶│lib/detectors/    │    │ Node.js Runtime │
│   index.js      │    │   index.js       │    │  Environment    │
│  (Orchestrator) │    │  (Detection)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/scanner/     │    │lib/scanner/       │    │ External APIs    │
│dependency-      │    │http-discovery.js  │    │ (GitHub, Git)    │
│detection.js     │    │git-discovery.js   │    │                 │
│ (Analysis)      │    │ (Remote Access)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Module Responsibilities

### 1. `lib/scanner/index.js` - Main Orchestration Layer

**Technical Implementation:**
- Coordinates all scanning operations
- Integrates detectors for environment analysis
- Manages custom dependency discovery workflow
- Handles CLI flags and scan options
- Provides comprehensive error handling and logging

**Core Functions:**
```javascript
async function scan(customExclusions, options) -> ScanResult
async function buildEslintConfig(options) -> EslintConfig
```

**Scan Workflow:**
```javascript
async function scan(customExclusions = [], options = {}) {
  // 1. Environment Detection (via detectors)
  const currentNodeVersion = detectNodeVersion()
  const packageManager = detectPackageManager()
  const lockfiles = detectLockfiles()

  // 2. Basic Package Reading
  const packageJson = readPackageJson()
  const selectedLockfile = readLockfile(lockfiles)

  // 3. Workspace Detection
  const hasWorkspaces = detectWorkspaces(packageJson)

  // 4. Custom Dependency Discovery
  const customPackages = await discoverCustomDependencies(packageJson, options)

  // 5. File System Analysis
  const ciConfigs = await scanCiConfigs()
  const cppAddons = detectCppAddons()

  // 6. Static API Analysis
  const analysisData = await analyzeProject(packageJson, options)

  return {
    projectInfo: { packageManager, hasWorkspaces },
    scannedData: { packageJson, allPackageJsons, lockfile, ... },
    warnings: [...]
  }
}
```

**CLI Options Handling:**
- `skipWorkspaceScan`: Disable custom dependency discovery
- `localOnly`: Only scan local file dependencies
- `skipTarballs`: Skip HTTP tarball discovery
- `maxFiles`: Limit number of package.json files
- `scanDepth`: Limit directory scan depth
- Logger injection for debugging and monitoring

### 2. `lib/scanner/dependency-detection.js` - Dependency Analysis Layer

**Technical Implementation:**
- Pattern matching for custom dependency types
- URL parsing and validation
- Protocol detection and classification
- Git URL parsing with ref extraction

**Core Functions:**
```javascript
function detectCustomDependency(version) -> DependencyInfo
function parseGitUrl(gitUrl) -> GitUrlInfo
```

**Supported Dependency Types:**
```javascript
// Local file dependencies
"file:./packages/shared" -> { type: 'file', path: './packages/shared' }

// Git repositories (all protocols)
"git+ssh://git@github.com:user/repo.git#v1.0.0" -> {
  type: 'git',
  protocol: 'ssh',
  repo: 'git@github.com:user/repo.git',
  ref: 'v1.0.0'
}

// GitHub shorthand
"lodash/lodash" -> { type: 'github', owner: 'lodash', repo: 'lodash' }

// HTTP/HTTPS tarballs
"https://example.com/package.tgz" -> { type: 'tarball', url: '...' }
```

**Detection Algorithm:**
```javascript
function detectCustomDependency(version) {
  // 1. File dependencies
  if (version.startsWith('file:')) return detectFileDependency(version)

  // 2. Git dependencies (all protocols)
  if (version.startsWith('git+') || version.includes('.git')) {
    return detectGitDependency(version)
  }

  // 3. GitHub shorthand (user/repo format)
  if (isGitHubShorthand(version)) return detectGitHubShorthand(version)

  // 4. HTTP tarballs
  if (version.startsWith('http')) return detectTarballDependency(version)

  // 5. Regular npm registry dependency
  return { type: 'npm', version }
}
```

### 3. `lib/scanner/git-discovery.js` - Git Repository Access Layer

**Technical Implementation:**
- Shallow git cloning for performance
- Timeout and error handling
- Temporary directory management
- SSH and HTTPS protocol support

**Core Functions:**
```javascript
async function checkGitAvailable() -> boolean
async function discoverGitDependency(name, gitUrl) -> DiscoveryResult
```

**Git Discovery Process:**
```javascript
async function discoverGitDependency(name, gitUrl) {
  const tempDir = createTempDirectory()

  try {
    // 1. Parse git URL to extract repo and ref
    const { repo, ref } = parseGitUrl(gitUrl)

    // 2. Shallow clone with timeout (30s)
    await git.clone(repo, tempDir, {
      depth: 1,
      branch: ref,
      timeout: 30000
    })

    // 3. Read package.json from cloned repository
    const pkg = await readJSON(path.join(tempDir, 'package.json'))

    return {
      success: true,
      path: gitUrl,
      content: pkg,
      sourceType: 'git'
    }
  } catch (error) {
    return {
      success: false,
      warning: `Failed to clone: ${error.message}`
    }
  } finally {
    // 4. Always cleanup temp directory
    await cleanupTempDirectory(tempDir)
  }
}
```

**Safety Features:**
- Shallow cloning (`--depth=1`) for speed and bandwidth
- 30-second timeout per repository
- Automatic cleanup of temporary directories
- Graceful error handling with warnings

### 4. `lib/scanner/http-discovery.js` - HTTP-Based Discovery Layer

**Technical Implementation:**
- GitHub API integration for shorthand notation
- Tarball download and extraction
- Size limits and timeout enforcement
- Fallback strategies for different sources

**Core Functions:**
```javascript
async function discoverGitHubShorthand(name, shorthand) -> DiscoveryResult
async function discoverTarballDependency(name, tarballUrl) -> DiscoveryResult
async function tryReadFromNodeModules(name, version) -> DiscoveryResult
```

**GitHub Shorthand Discovery:**
```javascript
async function discoverGitHubShorthand(name, shorthand) {
  const [userRepo, ref = 'HEAD'] = shorthand.split('#')
  const [owner, repo] = userRepo.split('/')

  // Try multiple branch names in order of preference
  const urls = [
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/package.json`,
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/package.json`
  ]

  for (const url of urls) {
    try {
      const content = await fetchWithTimeout(url, 10000)
      const pkg = JSON.parse(content)

      return { success: true, path: `github:${shorthand}`, content: pkg }
    } catch {
      continue // Try next URL
    }
  }

  return { success: false, warning: 'Repository not found' }
}
```

**Tarball Discovery:**
```javascript
async function discoverTarballDependency(name, tarballUrl) {
  const tempDir = createTempDirectory()

  try {
    // 1. Download with size limit (10MB) and timeout (30s)
    const tarballPath = await downloadWithLimit(tarballUrl, 10 * 1024 * 1024, 30000)

    // 2. Extract with timeout (10s)
    await extractTarball(tarballPath, tempDir, { timeout: 10000 })

    // 3. Find and read package.json
    const pkgPath = findPackageJson(tempDir)
    const pkg = await readJSON(pkgPath)

    return { success: true, path: tarballUrl, content: pkg }
  } catch (error) {
    return { success: false, warning: `Failed to download/extract: ${error.message}` }
  } finally {
    await cleanupTempDirectory(tempDir)
  }
}
```

**Node Modules Optimization:**
```javascript
// Before trying expensive discovery methods, check if already installed
async function tryReadFromNodeModules(name, version) {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules', name)

  if (await directoryExists(nodeModulesPath)) {
    const pkgPath = path.join(nodeModulesPath, 'package.json')
    if (await fileExists(pkgPath)) {
      const content = await readJSON(pkgPath)
      return {
        success: true,
        path: nodeModulesPath,
        content,
        sourceType: 'node_modules'
      }
    }
  }

  return { success: false } // Fall back to git/HTTP discovery
}
```

### 5. `lib/scanner/file-scanners.js` - File System Analysis Layer

**Technical Implementation:**
- Glob-based file discovery
- CI/CD configuration detection
- C++ addon identification
- Workspace package scanning

**Core Functions:**
```javascript
async function scanCiConfigs() -> CiConfig[]
async function scanBindingGypFiles() -> BindingGypFile[]
async function detectCppAddons() -> CppAddon[]
async function discoverAllPackageJsonFiles() -> PackageJsonFile[]
```

**CI Configuration Scanning:**
```javascript
async function scanCiConfigs() {
  const ciPatterns = [
    '.github/workflows/*.yml',
    '.github/workflows/*.yaml',
    '.gitlab-ci.yml',
    'Jenkinsfile',
    '.travis.yml',
    'azure-pipelines.yml',
    'circle.yml'
  ]

  const configs = []
  for (const pattern of ciPatterns) {
    const files = await glob(pattern, { cwd: process.cwd() })
    configs.push(...files.map(file => ({ type: getCiType(file), path: file })))
  }

  return configs
}
```

**Workspace Package Discovery:**
```javascript
async function discoverAllPackageJsonFiles() {
  // 1. Find all package.json files in workspace
  const packageFiles = await glob('**/package.json', {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**']
  })

  // 2. Read and categorize each package
  const packages = []
  for (const file of packageFiles) {
    const content = await readJSON(file)
    const isRoot = file === 'package.json'

    packages.push({
      path: file,
      content,
      isRoot,
      isTruncated: false
    })
  }

  return packages
}
```

### 6. `lib/scanner/package-readers.js` - Package Processing Layer

**Technical Implementation:**
- Batch package.json reading
- Custom dependency orchestration
- Content validation and normalization
- Discovery result aggregation

**Core Functions:**
```javascript
async function readMultiplePackageJsons(packageFiles) -> PackageJson[]
async function discoverCustomDependencies(packageJson, options) -> DiscoveryResult
```

**Custom Dependency Orchestration:**
```javascript
async function discoverCustomDependencies(packageJson, options) {
  const { localOnly = false, skipTarballs = false } = options
  const discovered = []
  const warnings = []

  // 1. Extract all dependencies from package.json
  const allDeps = extractAllDependencies(packageJson)

  // 2. Process each custom dependency
  for (const [name, version] of Object.entries(allDeps)) {
    const detection = detectCustomDependency(version)

    if (!detection.isCustomSource) continue

    // 3. Check CLI flags
    if (localOnly && detection.type !== 'file') continue
    if (skipTarballs && detection.type === 'tarball') continue

    // 4. Try node_modules first (optimization)
    const nodeModulesResult = await tryReadFromNodeModules(name, version)
    if (nodeModulesResult.success) {
      discovered.push({ name, ...nodeModulesResult })
      continue
    }

    // 5. Fall back to appropriate discovery method
    const result = await discoverByType(name, version, detection.type)
    if (result.success) {
      discovered.push({ name, ...result })
    } else {
      warnings.push(result.warning)
    }
  }

  return { discovered, warnings }
}
```

### 7. `lib/scanner/analyzer.js` - Static API Analysis Layer

**Technical Implementation:**
- ESLint integration for code analysis
- Custom rule configuration
- Node.js API usage detection
- Performance and compatibility analysis

**Core Functions:**
```javascript
async function analyzeProject(packageJson, options) -> AnalysisResult
function buildEslintConfig(options) -> EslintConfig
```

**Analysis Workflow:**
```javascript
async function analyzeProject(packageJson, options = {}) {
  // 1. Build ESLint configuration for Node.js API detection
  const eslintConfig = buildEslintConfig({
    targetVersion: options.targetNodeVersion || '20',
    includePatterns: options.includePatterns || ['**/*.js'],
    excludePatterns: options.excludePatterns || []
  })

  // 2. Run ESLint on project files
  const results = await runEslint(eslintConfig)

  // 3. Process and categorize findings
  const findings = processEslintResults(results)

  return {
    status: 'success',
    error: null,
    findings: findings.map(finding => ({
      rule: finding.ruleId,
      message: finding.message,
      file: finding.filePath,
      line: finding.line,
      severity: finding.severity,
      category: categorizeFinding(finding)
    }))
  }
}
```

## Data Flow Architecture

### Request Processing Pipeline

```
Input: { customExclusions, options }
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Environment Detection                                  │
│    - Node.js version detection                           │
│    - Package manager identification                      │
│    - Lockfile discovery and reading                      │
│    - Basic package.json parsing                          │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Workspace Analysis                                    │
│    - Workspace configuration detection                  │
│    - Local package discovery                             │
│    - Monorepo structure identification                   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Custom Dependency Discovery                          │
│    - Dependency type detection (file, git, github, etc) │
│    - Node modules optimization check                    │
│    - Remote discovery (git clone, API calls, downloads) │
│    - Error handling and warnings collection             │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. File System Analysis                                  │
│    - CI/CD configuration scanning                       │
│    - C++ addon detection                                │
│    - Binding.gyp file identification                    │
│    - Additional package.json discovery                  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Static Code Analysis                                  │
│    - ESLint configuration building                      │
│    - Node.js API usage detection                        │
│    - Compatibility issue identification                 │
│    - Performance and security analysis                  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
Output: { projectInfo, scannedData, warnings }
```

### Performance Optimization Strategy

**Node Modules First Approach:**
1. Check if dependency is already installed in `node_modules/`
2. If found, read directly (<1ms) and skip expensive remote operations
3. If not found, fall back to git clone, API calls, or downloads

**Sequential Processing:**
- Dependencies processed one at a time to avoid overwhelming servers
- Prevents excessive memory usage and disk I/O contention
- Allows for granular error handling and recovery

**Shallow Operations:**
- Git clones use `--depth=1` for 70% speed improvement
- API calls fetch only package.json, not entire repositories
- Size limits prevent memory exhaustion

## Error Handling Strategy

### Layered Error Handling

```javascript
// Discovery Layer (git-discovery.js, http-discovery.js)
async function discoverGitDependency(...) {
  try {
    // Discovery logic
  } catch (error) {
    return { success: false, warning: `Failed to clone: ${error.message}` }
  }
}

// Orchestration Layer (package-readers.js)
async function discoverCustomDependencies(...) {
  for (const dependency of dependencies) {
    const result = await discoverByType(...)
    if (!result.success) {
      warnings.push(result.warning) // Continue processing
    }
  }

  return { discovered, warnings }
}

// Main Scanner Layer (index.js)
async function scan(...) {
  try {
    // Main orchestration
  } catch (error) {
    logger.error('Scan failed', error)
    throw error // Critical errors propagate up
  }
}
```

### Error Categories
1. **Network Errors**: Timeouts, authentication failures, rate limiting
2. **File System Errors**: Permission issues, missing files, disk space
3. **Parse Errors**: Invalid JSON, malformed URLs, corrupted packages
4. **Configuration Errors**: Invalid options, missing dependencies
5. **Critical Errors**: Complete scan failure (rare, logged and re-thrown)

## Performance Characteristics

### Discovery Speed by Type

| Type | Method | Typical Speed | Optimization |
|------|--------|---------------|--------------|
| node_modules | Filesystem read | <1ms | **First priority** |
| file: | Filesystem | <1ms | Instant access |
| github: | API fetch | ~200ms | No cloning needed |
| git: | Shallow clone | 5-30s | depth=1 optimization |
| tarball | Download+extract | 5-20s | Size limits |

### Memory Usage
- **Streaming Downloads**: Tarballs downloaded with size limits (10MB)
- **Temporary Files**: Automatic cleanup after each operation
- **Sequential Processing**: One dependency at a time to limit memory
- **Result Aggregation**: Only package.json content retained

### Scalability Considerations
- **Large Monorepos**: Sequential processing prevents resource exhaustion
- **Network Reliability**: Timeouts and retry logic handle unreliable connections
- **Disk Space**: Temporary directories cleaned up immediately
- **Concurrent Safety**: Unique temp directory names prevent conflicts

## Integration Points

### External Dependencies
- **lib/detectors**: Environment detection (Node.js version, package manager, etc.)
- **Node.js fs module**: File system operations
- **Node.js child_process**: Git operations and tar extraction
- **ESLint**: Static code analysis engine
- **GitHub API**: Repository content access

### API Surface

```javascript
// Primary public API
async function scan(customExclusions, options) -> ScanResult

// Secondary APIs
async function buildEslintConfig(options) -> EslintConfig
async function analyzeProject(packageJson, options) -> AnalysisResult

// Utility APIs (exported for testing)
async function discoverCustomDependencies(packageJson, options) -> DiscoveryResult
function detectCustomDependency(version) -> DependencyInfo
```

### Data Contracts

```typescript
interface ScanOptions {
  skipWorkspaceScan?: boolean
  localOnly?: boolean
  skipTarballs?: boolean
  logger?: Logger
  targetNodeVersion?: string
  includePatterns?: string[]
  excludePatterns?: string[]
  maxFiles?: number
  scanDepth?: number
}

interface ScanResult {
  projectInfo: {
    packageManager: PackageManagerInfo
    hasWorkspaces: boolean
  }
  scannedData: {
    packageJson: PackageJsonInfo
    allPackageJsons: PackageJsonInfo[]
    lockfile: LockfileInfo
    lockfilesDetected: string[]
    ciConfigsFound: CiConfigInfo[]
    cppAddons: CppAddonInfo[]
  }
  warnings: string[]
}
```

## Testing Architecture

### Test Strategy by Module

1. **index.js**: Integration testing with full scan workflow
2. **dependency-detection.js**: Pattern matching and URL parsing tests
3. **git-discovery.js**: Git operations with mocking and timeout testing
4. **http-discovery.js**: API calls, downloads, and node_modules optimization
5. **file-scanners.js**: File system discovery and glob pattern testing
6. **package-readers.js**: Batch processing and orchestration testing
7. **analyzer.js**: ESLint integration and rule configuration testing

### Mock Implementation Pattern

```javascript
// Git operations mock
const mockGit = {
  clone: async (repo, dir, options) => {
    if (options.timeout < 1000) throw new Error('Timeout')
    // Mock successful clone
  }
}

// HTTP operations mock
const mockHttp = {
  fetchWithTimeout: async (url, timeout) => {
    if (url.includes('invalid')) throw new Error('Not found')
    return JSON.stringify({ name: 'mock-package', version: '1.0.0' })
  }
}

// File system mock
const mockFs = {
  fileExists: async (path) => path.includes('exists'),
  readJSON: async (path) => ({ name: 'mock', version: '1.0.0' })
}
```

### Test Coverage Areas
- **Happy Path**: Normal operation with all discovery types
- **Error Conditions**: Network failures, authentication issues, timeouts
- **Edge Cases**: Empty projects, malformed dependencies, large files
- **Performance**: Timeout handling, size limits, memory usage
- **CLI Flags**: All flag combinations and their effects
- **Integration**: End-to-end scan workflow validation

This architecture provides a robust, scalable, and maintainable foundation for comprehensive project analysis and dependency discovery in the Node.js upgrade analysis tool.
