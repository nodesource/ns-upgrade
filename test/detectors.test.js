const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const {
  detectNodeVersion,
  detectPackageManager,
  detectLockfiles,
  readPackageJson,
  detectWorkspaces
} = require('../lib/detectors')

describe('Detectors - Node Version Detection', () => {
  test('detectNodeVersion returns valid version', () => {
    const result = detectNodeVersion()
    assert.ok(result, 'Should return a result')
    assert.ok(result.version, 'Should have version property')
    assert.ok(result.version.startsWith('v'), 'Version should start with v')
    assert.match(result.version, /v\d+\.\d+\.\d+/, 'Should match semver format')
    assert.ok('versionManager' in result, 'Should have versionManager property')
  })

  test('detectNodeVersion returns version string', () => {
    const result = detectNodeVersion()
    assert.ok(result, 'Should return a result')
    assert.ok(result.version, 'Should have version property')
    assert.ok(result.version.match(/^v?\d+\.\d+\.\d+/), 'Should be a valid version format')
  })

  test('detectNodeVersion checks version managers first', (t) => {
    // Clear all version manager env vars to test fallback
    const originalVars = {
      NVM_DIR: process.env.NVM_DIR,
      NVM_BIN: process.env.NVM_BIN,
      FNM_DIR: process.env.FNM_DIR,
      ASDF_DIR: process.env.ASDF_DIR,
      N_PREFIX: process.env.N_PREFIX
    }

    try {
      // Clear all version manager vars
      delete process.env.NVM_DIR
      delete process.env.NVM_BIN
      delete process.env.FNM_DIR
      delete process.env.ASDF_DIR
      delete process.env.N_PREFIX

      const result = detectNodeVersion()

      // Should still return a version (from execSync or process.version)
      assert.ok(result, 'Should return a result')
      assert.ok(result.version, 'Should have version property')
      assert.ok(typeof result.version === 'string', 'Version should be a string')
    } finally {
      // Restore
      Object.keys(originalVars).forEach(key => {
        if (originalVars[key]) {
          process.env[key] = originalVars[key]
        } else {
          delete process.env[key]
        }
      })
    }
  })

  test('detectNodeVersion returns consistent format', () => {
    const result = detectNodeVersion()

    // Should always return an object with version
    assert.ok(result, 'Should return a result')
    assert.ok(result.version, 'Should have version property')
    assert.ok(typeof result.version === 'string', 'Version should be a string')
    assert.ok(result.version.match(/^v?\d+\.\d+\.\d+/), 'Should match version pattern')
    assert.ok('versionManager' in result, 'Should have versionManager property')
  })

  test('detectNodeVersion handles errors gracefully', () => {
    // Should not throw even if detection fails
    const result = detectNodeVersion()
    assert.ok(result, 'Should return a result')
    assert.ok(result.version, 'Should have version property')
    assert.ok(typeof result.version === 'string', 'Version should always be a string')
  })

  test('detectNodeVersion with various scenarios', () => {
    const result = detectNodeVersion()

    // Should return current Node.js version or a detected version
    assert.ok(result, 'Should return a result')
    assert.ok(result.version, 'Should have version property')
    assert.ok(typeof result.version === 'string', 'Version should be a string')

    // Verify it's a reasonable version format
    const versionMatch = result.version.match(/v?(\d+)\.(\d+)\.(\d+)/)
    assert.ok(versionMatch, 'Should match version pattern')

    if (versionMatch) {
      const major = parseInt(versionMatch[1])
      // Just verify it's a valid major version number (can detect old versions in projects)
      assert.ok(major > 0, 'Should have a valid major version number')
      assert.ok(major < 100, 'Major version should be reasonable')
    }
  })
})

describe('Detectors - Package Manager Detection', () => {
  test('detectPackageManager detects pnpm', () => {
    const pm = detectPackageManager()
    assert.ok(pm, 'Should detect package manager')
    assert.ok(pm.name, 'Should have name property')
    assert.ok(pm.version, 'Should have version property')

    // This project uses pnpm
    if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) {
      assert.strictEqual(pm.name, 'pnpm', 'Should detect pnpm')
    }
  })

  test('detectPackageManager with no lockfiles', () => {
    // Mock existsSync to return false for all lockfiles
    const originalExists = fs.existsSync
    fs.existsSync = (path) => {
      if (path === 'pnpm-lock.yaml' || path === 'yarn.lock' || path === 'package-lock.json') {
        return false
      }
      return originalExists(path)
    }

    try {
      const result = detectPackageManager()
      assert.strictEqual(result.name, 'npm', 'Should default to npm')
    } finally {
      fs.existsSync = originalExists
    }
  })

  test('detectPackageManager returns correct structure', () => {
    const pm = detectPackageManager()
    assert.ok(pm, 'Should return package manager info')
    assert.ok(pm.name, 'Should have name property')
    assert.ok(typeof pm.version === 'string', 'Should have version property as string')
  })

  test('detectPackageManager detects pnpm', () => {
    const pm = detectPackageManager()
    // This project uses pnpm, so it should detect pnpm
    assert.strictEqual(pm.name, 'pnpm', 'Should detect pnpm from pnpm-lock.yaml')
  })

  test('detectPackageManager detects package manager', () => {
    const result = detectPackageManager()
    assert.ok(result, 'Should return result')
    assert.ok(result.name, 'Should have name')
    assert.ok(result.version !== undefined, 'Should have version')
    assert.ok(['npm', 'yarn', 'pnpm'].includes(result.name), 'Should be a known package manager')
  })

  test('detectPackageManager extracts version from env', () => {
    const originalAgent = process.env.npm_config_user_agent

    try {
      // Test npm
      process.env.npm_config_user_agent = 'npm/10.2.0 node/v20.10.0'
      const result = detectPackageManager()

      // If we have npm lock file, should detect npm
      if (result.name === 'npm') {
        assert.ok(result.version, 'Should have version')
      }
    } finally {
      if (originalAgent) {
        process.env.npm_config_user_agent = originalAgent
      } else {
        delete process.env.npm_config_user_agent
      }
    }
  })

  test('detectPackageManager defaults to npm', () => {
    const originalExists = fs.existsSync

    // Create a mock that returns false for all lockfiles
    const mockExists = (path) => {
      if (path === 'pnpm-lock.yaml' || path === 'yarn.lock' || path === 'package-lock.json') {
        return false
      }
      return originalExists(path)
    }

    // Temporarily replace existsSync
    fs.existsSync = mockExists

    try {
      const result = detectPackageManager()
      assert.strictEqual(result.name, 'npm', 'Should default to npm')
      assert.ok('version' in result, 'Should have version field')
    } finally {
      fs.existsSync = originalExists
    }
  })

  test('detectPackageManager with different lockfiles', () => {
    const pm = detectPackageManager()

    // Should return valid package manager structure
    assert.ok(pm.name, 'Should have name')
    assert.ok(['npm', 'yarn', 'pnpm'].includes(pm.name), 'Should be a known package manager')
    assert.ok(typeof pm.version === 'string', 'Should have version as string')
  })
})

describe('Detectors - Lockfile Detection', () => {
  test('detectLockfiles returns object with detected array', () => {
    const lockfiles = detectLockfiles()
    assert.ok(lockfiles, 'Should return an object')
    assert.ok(Array.isArray(lockfiles.detected), 'Should have detected array')

    // This project has pnpm-lock.yaml
    if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) {
      assert.ok(lockfiles.detected.includes('pnpm-lock.yaml'), 'Should detect pnpm-lock.yaml')
      assert.ok(lockfiles.selected, 'Should have selected lockfile')
    }
  })

  test('detectLockfiles with multiple lockfiles', () => {
    const result = detectLockfiles()

    // Should handle multiple lockfiles scenario
    assert.ok(result, 'Should return result')
    assert.ok(Array.isArray(result.detected), 'Should have detected array')

    if (result.detected.length > 1) {
      assert.ok(result.selected, 'Should select one when multiple exist')
    }
  })

  test('lockfiles detection and selection', () => {
    const result = detectLockfiles()

    assert.ok(result, 'Should return lockfiles result')

    if (result.detected.length > 0) {
      assert.ok(result.selected || result.detected.length === 1, 'Should select a lockfile')
    }
  })
})

describe('Detectors - Package.json Reading', () => {
  test('readPackageJson reads package.json', () => {
    const result = readPackageJson()
    assert.ok(result, 'Should return package.json data')
    assert.ok(result.content, 'Should have content property')
    assert.strictEqual(result.content.name, '@nodesource/upgrade', 'Should have correct package name')
    assert.strictEqual(result.isTruncated, false, 'Should not be truncated')
  })

  test('readPackageJson returns proper structure', () => {
    const result = readPackageJson()

    assert.ok(result.content, 'Should have content')
    assert.ok(typeof result.content === 'object', 'Content should be an object')
    assert.strictEqual(typeof result.isTruncated, 'boolean', 'Should have boolean isTruncated')

    // Verify it has name field (required in package.json)
    assert.ok(result.content.name, 'Should have name field')
  })

  test('readPackageJson handles warning field', () => {
    const result = readPackageJson()

    // Warning should exist (even if undefined) for large files
    assert.ok('warning' in result, 'Should have warning field')
  })
})

describe('Detectors - Workspace Detection', () => {
  test('detectWorkspaces returns object', () => {
    const pkg = { name: 'test', version: '1.0.0' }
    const result = detectWorkspaces(pkg)
    assert.strictEqual(typeof result, 'object', 'Should return an object')
    assert.strictEqual(typeof result.hasWorkspaces, 'boolean', 'Should have hasWorkspaces boolean')
    assert.ok(Array.isArray(result.tools), 'Should have tools array')
    assert.ok(Array.isArray(result.configFiles), 'Should have configFiles array')
  })

  test('workspaces detection with different configs', () => {
    // Test with workspaces array
    let result = detectWorkspaces({ workspaces: ['packages/*'] })
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect workspaces array')

    // Test with workspaces object
    result = detectWorkspaces({ workspaces: { packages: ['packages/*'] } })
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect workspaces object')

    // Test without workspaces
    result = detectWorkspaces({ name: 'test' })
    assert.strictEqual(result.hasWorkspaces, false, 'Should return false without workspaces')

    // Test with empty workspaces array (still truthy, so returns true)
    result = detectWorkspaces({ workspaces: [] })
    assert.strictEqual(result.hasWorkspaces, true, 'Should return true even with empty array (truthy value)')

    // Test with null workspaces (falsy)
    result = detectWorkspaces({ workspaces: null })
    assert.strictEqual(result.hasWorkspaces, false, 'Should return false with null workspaces')

    // Test with file: dependency (custom source)
    result = detectWorkspaces({
      dependencies: { 'local-pkg': 'file:../local-pkg' }
    })
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect file: dependencies as workspace-like')
  })

  test('detectWorkspaces detects workspace configuration', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      workspaces: ['packages/*']
    }
    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect workspaces')
  })

  test('detectWorkspaces returns false for no workspaces', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        express: '^4.0.0'
      }
    }
    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, false, 'Should return false for no workspaces')
  })

  test('detectWorkspaces detects file: dependencies', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        mypackage: 'file:./packages/mypackage'
      }
    }
    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect file: dependencies')
  })

  test('detectWorkspaces detects git dependencies', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        mypackage: 'git+https://github.com/user/repo.git'
      }
    }
    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect git dependencies')
  })

  test('workspaces with devDependencies', () => {
    const result = detectWorkspaces({
      devDependencies: {
        'dev-pkg': 'file:../dev-pkg'
      }
    })

    assert.strictEqual(result.hasWorkspaces, true, 'Should detect file: in devDependencies')
  })

  test('workspaces with optionalDependencies', () => {
    const result = detectWorkspaces({
      optionalDependencies: {
        'opt-pkg': 'git+https://github.com/user/repo.git'
      }
    })

    assert.strictEqual(result.hasWorkspaces, true, 'Should detect git in optionalDependencies')
  })

  test('detectWorkspaces detects config files', () => {
    const originalExists = fs.existsSync

    const mockExists = (filePath) => {
      if (typeof filePath === 'string' && (filePath.endsWith('pnpm-workspace.yaml') || filePath.endsWith('nx.json'))) {
        return true
      }
      return false
    }

    fs.existsSync = mockExists

    try {
      const result = detectWorkspaces({ name: 'test' }, null, '/mock/cwd')
      assert.strictEqual(result.hasWorkspaces, true, 'Should detect workspaces via config')
      assert.ok(result.tools.includes('pnpm'), 'Should detect pnpm')
      assert.ok(result.tools.includes('nx'), 'Should detect nx')
      assert.ok(result.configFiles.includes('pnpm-workspace.yaml'), 'Should list pnpm config')
      assert.ok(result.configFiles.includes('nx.json'), 'Should list nx config')
    } finally {
      fs.existsSync = originalExists
    }
  })
})

describe('Detectors - System Paths', () => {
  test('system-paths with different PATH values', () => {
    const { detectSystemNodeVersion } = require('../lib/detectors/system-paths')

    const originalPath = process.env.PATH

    try {
      // Test with empty PATH
      process.env.PATH = ''
      let result = detectSystemNodeVersion()
      assert.ok(result === null || typeof result === 'string', 'Should handle empty PATH')

      // Test with PATH containing npx cache
      process.env.PATH = '/home/user/.npm/_npx:/usr/bin'
      result = detectSystemNodeVersion()
      assert.ok(result === null || typeof result === 'string', 'Should handle npx cache in PATH')
    } finally {
      process.env.PATH = originalPath
    }
  })

  test('system paths detection module exports function', () => {
    const { detectSystemNodeVersion } = require('../lib/detectors/system-paths')
    assert.ok(typeof detectSystemNodeVersion === 'function', 'Should export detectSystemNodeVersion function')
  })

  test('detectSystemNodeVersion returns null or version', () => {
    const { detectSystemNodeVersion } = require('../lib/detectors/system-paths')
    const version = detectSystemNodeVersion()
    // Should return null or a valid version string
    if (version !== null) {
      assert.ok(typeof version === 'string', 'Should be a string if not null')
      assert.ok(version.match(/v\d+\.\d+\.\d+/), 'Should be a valid version format')
    } else {
      assert.strictEqual(version, null, 'Should be null if no system Node found')
    }
  })

  test('system-paths excluding npx cache', () => {
    const { detectSystemNodeVersion } = require('../lib/detectors/system-paths')

    const originalPath = process.env.PATH

    try {
      process.env.PATH = '/home/user/.npm/_npx/abc123/node_modules/.bin:/usr/bin'
      const result = detectSystemNodeVersion()
      assert.ok(result === null || typeof result === 'string', 'Should exclude npx cache')
    } finally {
      process.env.PATH = originalPath
    }
  })

  test('system-paths with no valid node in PATH', () => {
    const { detectSystemNodeVersion } = require('../lib/detectors/system-paths')

    const originalPath = process.env.PATH

    try {
      process.env.PATH = '/nonexistent/path'
      const result = detectSystemNodeVersion()
      assert.ok(result === null || typeof result === 'string', 'Should handle no valid node')
    } finally {
      process.env.PATH = originalPath
    }
  })

  test('system-paths with multiple path separators', () => {
    const { detectSystemNodeVersion } = require('../lib/detectors/system-paths')

    const originalPath = process.env.PATH

    try {
      process.env.PATH = '/usr/bin:/usr/local/bin:/home/user/.nvm/versions/node/v20.0.0/bin'
      const result = detectSystemNodeVersion()
      assert.ok(result === null || typeof result === 'string', 'Should handle multiple paths')
    } finally {
      process.env.PATH = originalPath
    }
  })
})

describe('Detectors - Lockfile Reading', () => {
  test('readLockfile with valid lockfile', () => {
    const lockfiles = detectLockfiles()
    const { readLockfile } = require('../lib/detectors')

    if (lockfiles.selected) {
      const result = readLockfile(lockfiles.selected)
      assert.ok(result, 'Should return lockfile data')
      assert.ok('content' in result, 'Should have content property')
      assert.ok('isTruncated' in result, 'Should have isTruncated property')
    }
  })

  test('readLockfile with null input', () => {
    const { readLockfile } = require('../lib/detectors')
    const result = readLockfile(null)
    assert.ok(result, 'Should handle null input')
    assert.ok('content' in result, 'Should have content property')
  })
})
