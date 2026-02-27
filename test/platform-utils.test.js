const { test, describe } = require('node:test')
const assert = require('node:assert')
const platformUtils = require('../lib/platform-utils')

describe('Platform Utils - Platform Detection', () => {
  test('should detect platform correctly', () => {
    const { isWindows, isMac, isLinux } = platformUtils
    const platform = process.platform

    if (platform === 'win32') {
      assert.strictEqual(isWindows, true, 'Should detect Windows')
      assert.strictEqual(isMac, false, 'Should not detect as Mac')
      assert.strictEqual(isLinux, false, 'Should not detect as Linux')
    } else if (platform === 'darwin') {
      assert.strictEqual(isWindows, false, 'Should not detect as Windows')
      assert.strictEqual(isMac, true, 'Should detect Mac')
      assert.strictEqual(isLinux, false, 'Should not detect as Linux')
    } else if (platform === 'linux') {
      assert.strictEqual(isWindows, false, 'Should not detect as Windows')
      assert.strictEqual(isMac, false, 'Should not detect as Mac')
      assert.strictEqual(isLinux, true, 'Should detect Linux')
    }
  })

  test('only one platform should be true', () => {
    const { isWindows, isMac, isLinux } = platformUtils
    const trueCount = [isWindows, isMac, isLinux].filter(Boolean).length
    assert.strictEqual(trueCount, 1, 'Exactly one platform should be detected')
  })
})

describe('Platform Utils - Command Utilities', () => {
  test('getWhichCommand returns correct command for platform', () => {
    const whichCmd = platformUtils.getWhichCommand()
    if (platformUtils.isWindows) {
      assert.strictEqual(whichCmd, 'where', 'Should return "where" on Windows')
    } else {
      assert.strictEqual(whichCmd, 'which', 'Should return "which" on Unix')
    }
  })

  test('findExecutable can find node', () => {
    const nodePath = platformUtils.findExecutable('node')
    assert.ok(nodePath, 'Should find node executable')
    assert.ok(typeof nodePath === 'string', 'Should return a string')
    assert.ok(nodePath.length > 0, 'Should not be empty')
  })

  test('findExecutable returns null for non-existent command', () => {
    const result = platformUtils.findExecutable('this-command-definitely-does-not-exist-123456789')
    assert.strictEqual(result, null, 'Should return null for non-existent command')
  })

  test('isCommandAvailable checks command availability', () => {
    const hasNode = platformUtils.isCommandAvailable('node')
    assert.strictEqual(hasNode, true, 'node should be available')

    const hasInvalidCmd = platformUtils.isCommandAvailable('this-command-definitely-does-not-exist-123456789')
    assert.strictEqual(hasInvalidCmd, false, 'Invalid command should not be available')
  })
})

describe('Platform Utils - Path Utilities', () => {
  test('normalizePathSeparators converts backslashes to forward slashes', () => {
    const windowsPath = 'C:\\Program Files\\nodejs\\node.exe'
    const normalized = platformUtils.normalizePathSeparators(windowsPath)
    assert.strictEqual(normalized, 'C:/Program Files/nodejs/node.exe', 'Should convert backslashes')
  })

  test('normalizePathSeparators handles already normalized paths', () => {
    const unixPath = '/usr/local/bin/node'
    const normalized = platformUtils.normalizePathSeparators(unixPath)
    assert.strictEqual(normalized, unixPath, 'Should not change forward slashes')
  })

  test('extractVersionFromPath extracts semantic version', () => {
    const paths = [
      '/usr/local/n/versions/node/18.17.1/bin/node',
      'C:\\Program Files\\nodejs\\v20.10.0\\node.exe',
      '/home/user/.nvm/versions/node/v16.14.2/bin/node'
    ]

    paths.forEach(p => {
      const version = platformUtils.extractVersionFromPath(p)
      assert.ok(version, `Should extract version from ${p}`)
      assert.ok(version.match(/^\d+\.\d+\.\d+$/), `Version should be semantic: ${version}`)
    })
  })

  test('extractVersionFromPath returns null for paths without version', () => {
    const version = platformUtils.extractVersionFromPath('/usr/bin/node')
    assert.strictEqual(version, null, 'Should return null when no version found')
  })

  test('createPathPattern creates valid regex', () => {
    const pattern = platformUtils.createPathPattern('n', 'versions', 'node')
    assert.ok(pattern instanceof RegExp, 'Should return RegExp')
  })

  test('getDefaultInstallPaths returns array', () => {
    const nodePaths = platformUtils.getDefaultInstallPaths('node')
    assert.ok(Array.isArray(nodePaths), 'Should return array')
    assert.ok(nodePaths.length > 0, 'Should return at least one path')

    const gitPaths = platformUtils.getDefaultInstallPaths('git')
    assert.ok(Array.isArray(gitPaths), 'Should return array for git')
  })
})

describe('Platform Utils - System Utilities', () => {
  test('getNullDevice returns correct device for platform', () => {
    const nullDevice = platformUtils.getNullDevice()
    if (platformUtils.isWindows) {
      assert.strictEqual(nullDevice, 'NUL', 'Should return NUL on Windows')
    } else {
      assert.strictEqual(nullDevice, '/dev/null', 'Should return /dev/null on Unix')
    }
  })

  test('getEnvWithFallback returns env variable if exists', () => {
    process.env.TEST_VAR_12345 = 'test-value'
    const result = platformUtils.getEnvWithFallback('TEST_VAR_12345', 'fallback')
    assert.strictEqual(result, 'test-value', 'Should return env variable value')
    delete process.env.TEST_VAR_12345
  })

  test('getEnvWithFallback returns fallback if env variable does not exist', () => {
    const result = platformUtils.getEnvWithFallback('THIS_DOES_NOT_EXIST_12345', 'fallback')
    assert.strictEqual(result, 'fallback', 'Should return fallback value')
  })

  test('isVersionManagerSupported returns boolean', () => {
    const managers = ['volta', 'fnm', 'nvm', 'n', 'asdf']
    managers.forEach(manager => {
      const supported = platformUtils.isVersionManagerSupported(manager)
      assert.strictEqual(typeof supported, 'boolean', `Should return boolean for ${manager}`)
    })
  })

  test('volta and fnm should be supported on all platforms', () => {
    assert.strictEqual(platformUtils.isVersionManagerSupported('volta'), true, 'Volta should be supported')
    assert.strictEqual(platformUtils.isVersionManagerSupported('fnm'), true, 'FNM should be supported')
  })

  test('nvm, n, asdf should not be supported on Windows', () => {
    if (platformUtils.isWindows) {
      assert.strictEqual(platformUtils.isVersionManagerSupported('nvm'), false, 'NVM should not be supported on Windows')
      assert.strictEqual(platformUtils.isVersionManagerSupported('n'), false, 'N should not be supported on Windows')
      assert.strictEqual(platformUtils.isVersionManagerSupported('asdf'), false, 'ASDF should not be supported on Windows')
    }
  })
})

describe('Platform Utils - Error Handling', () => {
  test('functions handle invalid inputs gracefully', () => {
    // These should not throw errors
    assert.doesNotThrow(() => {
      platformUtils.findExecutable('')
      platformUtils.extractVersionFromPath('')
      platformUtils.normalizePathSeparators('')
      platformUtils.isVersionManagerSupported('invalid-manager')
      platformUtils.getDefaultInstallPaths('invalid-tool')
    }, 'Should not throw errors for invalid inputs')
  })
})
