const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  discoverGitHubShorthand,
  tryReadFromNodeModules
} = require('../lib/scanner/http-discovery')

describe('HTTP Discovery - Function Exports', () => {
  test('tryReadFromNodeModules function exists', () => {
    assert.ok(typeof tryReadFromNodeModules === 'function', 'Should export tryReadFromNodeModules function')
  })

  test('discoverGitHubShorthand function exists', () => {
    assert.ok(typeof discoverGitHubShorthand === 'function', 'Should export discoverGitHubShorthand function')
  })

  test('module exports', () => {
    const httpDiscovery = require('../lib/scanner/http-discovery')
    assert.ok(httpDiscovery.discoverGitHubShorthand, 'Should export discoverGitHubShorthand')
    assert.ok(httpDiscovery.tryReadFromNodeModules, 'Should export tryReadFromNodeModules')
    assert.ok(httpDiscovery.discoverTarballDependency, 'Should export discoverTarballDependency')
  })
})

describe('HTTP Discovery - GitHub Shorthand Discovery', () => {
  test('discoverGitHubShorthand validates shorthand format', async () => {
    // Test with invalid format (missing repo part) - should fail quickly without network call
    const result = await discoverGitHubShorthand('test-pkg', 'invalid-format')
    assert.ok(result, 'Should return a result object')
    assert.strictEqual(result.success, false, 'Should fail for invalid format')
    assert.ok(result.warning, 'Should have warning message')
    assert.ok(result.warning.includes('Invalid GitHub shorthand format'), 'Should indicate format error')
  })
})
