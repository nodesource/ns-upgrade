// Default exclusion patterns for file scanning
const DEFAULT_EXCLUSIONS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  'out'
]

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  packageJson: 10 * 1024 * 1024, // 10MB
  lockfile: 50 * 1024 * 1024 // 50MB
}

// Known C++ addon dependencies
const KNOWN_CPP_ADDONS = [
  'node-sass',
  'bcrypt',
  'node-gyp',
  'sqlite3',
  'canvas',
  'sharp',
  'grpc',
  'protobufjs',
  'leveldb',
  'rocksdb',
  'msgpack',
  'snappy',
  'lz4',
  'brotli',
  'zstd',
  'nan',
  'node-addon-api',
  'bindings',
  'node-gyp-build',
  'prebuild-install',
  'cmake-js'
]

// CI/CD system mappings
const CI_SYSTEMS = {
  'GitHub Actions': 'github',
  Jenkins: 'jenkins',
  'GitLab CI/CD': 'gitlab',
  CircleCI: 'circleci',
  'Travis CI': 'travis',
  'Azure Pipelines': 'azure',
  'AWS CodePipeline': 'aws',
  Other: 'other',
  None: 'none'
}

// CI/CD config file patterns
const CI_CONFIG_PATTERNS = [
  '.github/workflows/**/*.{yml,yaml}',
  'Jenkinsfile',
  '.gitlab-ci.yml',
  '.circleci/config.yml',
  '.travis.yml',
  'azure-pipelines.yml',
  'buildspec.yml'
]

// Target Node.js LTS versions
const TARGET_LTS_VERSIONS = [
  { name: 'Node.js 20 (LTS until April 2026)', value: '20' },
  { name: 'Node.js 22 (LTS until April 2027)', value: '22' },
  { name: 'Node.js 24 (LTS until April 2028)', value: '24' }
]

// Current Node.js version options (including historical LTS versions since v4)
const CURRENT_NODE_VERSIONS = [
  { name: 'Node.js 4 (Argon - EOL)', value: '4' },
  { name: 'Node.js 6 (Boron - EOL)', value: '6' },
  { name: 'Node.js 8 (Carbon - EOL)', value: '8' },
  { name: 'Node.js 10 (Dubnium - EOL)', value: '10' },
  { name: 'Node.js 12 (Erbium - EOL)', value: '12' },
  { name: 'Node.js 14 (Fermium - EOL)', value: '14' },
  { name: 'Node.js 16 (Gallium - EOL)', value: '16' },
  { name: 'Node.js 18 (Hydrogen - EOL)', value: '18' },
  { name: 'Node.js 20 (Iron - LTS until April 2026)', value: '20' },
  { name: 'Node.js 22 (LTS until April 2027)', value: '22' },
  { name: 'Node.js 24 (LTS until April 2028)', value: '24' },
  { name: 'Other (specify custom version)', value: 'custom' }
]

// Production OS options
const PRODUCTION_OS_OPTIONS = [
  'Ubuntu Linux',
  'Red Hat Enterprise Linux (RHEL) / CentOS',
  'Debian Linux',
  'Amazon Linux',
  'Alpine Linux',
  'Windows Server',
  'macOS',
  'Other Linux Distribution',
  'Other'
]

// Development OS options
const DEVELOPMENT_OS_OPTIONS = [
  'Ubuntu Linux',
  'Red Hat Enterprise Linux (RHEL) / CentOS',
  'Debian Linux',
  'macOS',
  'Windows 10/11',
  'Other Linux Distribution',
  'Other'
]

// Package.json discovery limits for monorepo/workspace support
const PACKAGE_JSON_LIMITS = {
  maxFiles: 100, // Maximum number of package.json files to process
  scanDepth: 5 // Maximum directory depth for scanning
}

// NodeSource service endpoints
const ACCOUNTS_URL = 'https://accounts.nodesource.com'
const SUBMIT_URL = 'https://upgrade.nodesource.io'

module.exports = {
  DEFAULT_EXCLUSIONS,
  FILE_SIZE_LIMITS,
  KNOWN_CPP_ADDONS,
  CI_SYSTEMS,
  CI_CONFIG_PATTERNS,
  TARGET_LTS_VERSIONS,
  CURRENT_NODE_VERSIONS,
  PRODUCTION_OS_OPTIONS,
  DEVELOPMENT_OS_OPTIONS,
  PACKAGE_JSON_LIMITS,
  ACCOUNTS_URL,
  SUBMIT_URL
}
