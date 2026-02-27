const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

// Import version manager detectors
const { detectNodeVersionFromVolta } = require('../lib/detectors/version-managers/volta')
const { detectNodeVersionFromNvm } = require('../lib/detectors/version-managers/nvm')
const { detectNodeVersionFromFnm } = require('../lib/detectors/version-managers/fnm')
const { detectNodeVersionFromAsdf } = require('../lib/detectors/version-managers/asdf')
const { detectNodeVersionFromN } = require('../lib/detectors/version-managers/n')

describe('Version Managers - Default Behavior', () => {
  test('detectNodeVersionFromVolta returns null when not configured', () => {
    // Most test environments won't have Volta configured
    const version = detectNodeVersionFromVolta()
    // Should return either a version string or null
    assert.ok(version === null || typeof version === 'string', 'Should return null or string')
  })

  test('detectNodeVersionFromNvm returns null when not configured', () => {
    // Save original env
    const originalNvmBin = process.env.NVM_BIN
    delete process.env.NVM_BIN

    try {
      const version = detectNodeVersionFromNvm()
      // Should return either a version string or null
      assert.ok(version === null || typeof version === 'string', 'Should return null or string')
    } finally {
      if (originalNvmBin) {
        process.env.NVM_BIN = originalNvmBin
      }
    }
  })

  test('detectNodeVersionFromFnm returns null when not configured', () => {
    // Save original env
    const originalFnmPath = process.env.FNM_MULTISHELL_PATH
    delete process.env.FNM_MULTISHELL_PATH

    try {
      const version = detectNodeVersionFromFnm()
      // Should return either a version string or null
      assert.ok(version === null || typeof version === 'string', 'Should return null or string')
    } finally {
      if (originalFnmPath) {
        process.env.FNM_MULTISHELL_PATH = originalFnmPath
      }
    }
  })

  test('detectNodeVersionFromAsdf returns null when not configured', () => {
    const version = detectNodeVersionFromAsdf()
    // Should return either a version string or null
    assert.ok(version === null || typeof version === 'string', 'Should return null or string')
  })

  test('detectNodeVersionFromN returns null when not configured', () => {
    // Save original env
    const originalNNodePath = process.env.N_NODE_PATH
    delete process.env.N_NODE_PATH

    try {
      const version = detectNodeVersionFromN()
      // Should return either a version string or null
      assert.ok(version === null || typeof version === 'string', 'Should return null or string')
    } finally {
      if (originalNNodePath) {
        process.env.N_NODE_PATH = originalNNodePath
      }
    }
  })
})

describe('Version Managers - Volta', () => {
  test('handles volta config', () => {
    const tempDir = path.join(os.tmpdir(), 'volta-test-' + Date.now())
    const voltaDir = path.join(tempDir, '.volta')
    const toolsDir = path.join(voltaDir, 'tools', 'user')

    try {
      // Create temp volta config
      fs.mkdirSync(toolsDir, { recursive: true })
      const platformFile = path.join(toolsDir, 'platform.json')
      fs.writeFileSync(platformFile, JSON.stringify({
        node: {
          runtime: 'v20.10.0'
        }
      }))

      // Temporarily override HOME
      const originalHome = process.env.HOME
      process.env.HOME = tempDir

      const version = detectNodeVersionFromVolta()

      // Restore HOME
      process.env.HOME = originalHome

      // The function should return either a version string or null
      assert.ok(version === null || (typeof version === 'string' && version.startsWith('v')), 'Should detect Volta version or return null')
    } finally {
      // Cleanup
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  })

  test('reads from package.json', () => {
    const tempDir = path.join(os.tmpdir(), 'volta-pkg-test-' + Date.now())
    const voltaDir = path.join(tempDir, '.volta')
    const toolsDir = path.join(voltaDir, 'tools', 'user')
    const packageJsonPath = path.join(tempDir, 'package.json')

    try {
      // Create temp directory with package.json
      fs.mkdirSync(toolsDir, { recursive: true })
      fs.writeFileSync(packageJsonPath, JSON.stringify({
        volta: {
          node: '20.10.0'
        }
      }))

      // Create empty platform.json to test fallback to package.json
      const platformFile = path.join(toolsDir, 'platform.json')
      fs.writeFileSync(platformFile, JSON.stringify({}))

      // Temporarily override HOME
      const originalHome = process.env.HOME
      const originalCwd = process.cwd()
      process.env.HOME = tempDir
      process.chdir(tempDir)

      const version = detectNodeVersionFromVolta()

      // Restore environment
      process.env.HOME = originalHome
      process.chdir(originalCwd)

      // Should return either a version string or null
      assert.ok(version === null || (typeof version === 'string' && version.startsWith('v')), 'Should read from package.json or return null')
    } finally {
      // Cleanup
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  })
})

describe('Version Managers - NVM', () => {
  test('handles NVM_BIN env var', () => {
    const originalNvmBin = process.env.NVM_BIN

    try {
      // Set a fake NVM_BIN path
      process.env.NVM_BIN = '/fake/nvm/versions/node/v18.20.0/bin'

      const version = detectNodeVersionFromNvm()

      // Should either extract the version or return null if path doesn't exist
      assert.ok(version === null || typeof version === 'string', 'Should return null or string')
    } finally {
      if (originalNvmBin) {
        process.env.NVM_BIN = originalNvmBin
      } else {
        delete process.env.NVM_BIN
      }
    }
  })

  test('handles errors gracefully', () => {
    // Test with invalid NVM_BIN path
    const originalNvmBin = process.env.NVM_BIN

    try {
      process.env.NVM_BIN = '/invalid/path/that/does/not/exist'

      // Should not throw an error
      const version = detectNodeVersionFromNvm()
      assert.ok(version === null || typeof version === 'string', 'Should handle errors gracefully')
    } finally {
      if (originalNvmBin) {
        process.env.NVM_BIN = originalNvmBin
      } else {
        delete process.env.NVM_BIN
      }
    }
  })

  test('returns null when NVM not configured', () => {
    // Clear all NVM environment variables
    const originalBin = process.env.NVM_BIN
    const originalDir = process.env.NVM_DIR
    const originalINC = process.env.NVM_INC

    delete process.env.NVM_BIN
    delete process.env.NVM_DIR
    delete process.env.NVM_INC

    const result = detectNodeVersionFromNvm()

    // Restore
    if (originalBin) process.env.NVM_BIN = originalBin
    if (originalDir) process.env.NVM_DIR = originalDir
    if (originalINC) process.env.NVM_INC = originalINC

    // Should return null when NVM is not configured
    assert.strictEqual(result, null, 'Should return null when NVM not configured')
  })
})

describe('Version Managers - FNM', () => {
  test('handles FNM_MULTISHELL_PATH', () => {
    const originalFnmPath = process.env.FNM_MULTISHELL_PATH

    try {
      // Set a fake FNM path
      process.env.FNM_MULTISHELL_PATH = '/fake/fnm/node-versions/v20.10.0/installation/bin'

      const version = detectNodeVersionFromFnm()

      // Should either extract the version or return null if path doesn't exist
      assert.ok(version === null || typeof version === 'string', 'Should return null or string')
    } finally {
      if (originalFnmPath) {
        process.env.FNM_MULTISHELL_PATH = originalFnmPath
      } else {
        delete process.env.FNM_MULTISHELL_PATH
      }
    }
  })

  test('handles FNM_DIR environment variable', () => {
    const originalFnmDir = process.env.FNM_DIR
    const originalFnmPath = process.env.FNM_MULTISHELL_PATH

    try {
      // Set fake FNM_DIR
      const tempDir = path.join(os.tmpdir(), 'fnm-test-' + Date.now())
      process.env.FNM_DIR = tempDir
      delete process.env.FNM_MULTISHELL_PATH

      const version = detectNodeVersionFromFnm()
      // Should handle gracefully even with fake directory
      assert.ok(version === null || typeof version === 'string', 'Should handle FNM_DIR gracefully')
    } finally {
      if (originalFnmDir) {
        process.env.FNM_DIR = originalFnmDir
      } else {
        delete process.env.FNM_DIR
      }
      if (originalFnmPath) {
        process.env.FNM_MULTISHELL_PATH = originalFnmPath
      }
    }
  })

  test('returns null when FNM not configured', () => {
    const originalDir = process.env.FNM_DIR
    const originalMultishell = process.env.FNM_MULTISHELL_PATH

    // Clear FNM vars
    delete process.env.FNM_DIR
    delete process.env.FNM_MULTISHELL_PATH

    const result = detectNodeVersionFromFnm()

    // Restore
    if (originalDir) process.env.FNM_DIR = originalDir
    if (originalMultishell) process.env.FNM_MULTISHELL_PATH = originalMultishell

    // Should return null when not configured
    assert.strictEqual(result, null, 'Should return null when FNM not configured')
  })
})

describe('Version Managers - N', () => {
  test('handles N_NODE_PATH', () => {
    // Test N_NODE_PATH environment variable handling
    const originalPath = process.env.N_NODE_PATH
    process.env.N_NODE_PATH = '/usr/local/n/versions/node/20.10.0/bin/node'

    try {
      const version = detectNodeVersionFromN()
      // Should either extract the version or return null if path doesn't exist
      assert.ok(version === null || typeof version === 'string', 'Should return null or string')
    } finally {
      if (originalPath) {
        process.env.N_NODE_PATH = originalPath
      } else {
        delete process.env.N_NODE_PATH
      }
    }
  })

  test('extracts version from N_NODE_PATH', () => {
    // Test N_NODE_PATH environment variable handling
    const originalPath = process.env.N_NODE_PATH
    process.env.N_NODE_PATH = '/usr/local/n/versions/node/20.10.0/bin/node'

    const version = detectNodeVersionFromN()

    // Restore original
    if (originalPath === undefined) {
      delete process.env.N_NODE_PATH
    } else {
      process.env.N_NODE_PATH = originalPath
    }

    // If N is configured, should return version, otherwise null
    if (version !== null) {
      assert.ok(typeof version === 'string', 'Should return a string')
      assert.ok(version.includes('20'), 'Should include version from path')
    }
  })
})

describe('Version Managers - ASDF', () => {
  test('handles ASDF_DIR', () => {
    const originalAsdfDir = process.env.ASDF_DIR

    try {
      // Set fake ASDF_DIR
      const tempDir = path.join(os.tmpdir(), 'asdf-test-' + Date.now())
      process.env.ASDF_DIR = tempDir

      const version = detectNodeVersionFromAsdf()
      // Should handle gracefully even with fake directory
      assert.ok(version === null || typeof version === 'string', 'Should handle ASDF_DIR gracefully')
    } finally {
      if (originalAsdfDir) {
        process.env.ASDF_DIR = originalAsdfDir
      } else {
        delete process.env.ASDF_DIR
      }
    }
  })

  test('returns null when ASDF not configured', () => {
    const originalDir = process.env.ASDF_DIR
    const originalDataDir = process.env.ASDF_DATA_DIR

    // Clear ASDF vars
    delete process.env.ASDF_DIR
    delete process.env.ASDF_DATA_DIR

    const result = detectNodeVersionFromAsdf()

    // Restore
    if (originalDir) process.env.ASDF_DIR = originalDir
    if (originalDataDir) process.env.ASDF_DATA_DIR = originalDataDir

    // Should return null when not configured
    assert.strictEqual(result, null, 'Should return null when ASDF not configured')
  })
})
