const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  CI_SYSTEMS,
  KNOWN_CPP_ADDONS,
  DEFAULT_EXCLUSIONS,
  TARGET_LTS_VERSIONS,
  CURRENT_NODE_VERSIONS,
  FILE_SIZE_LIMITS,
  PRODUCTION_OS_OPTIONS,
  DEVELOPMENT_OS_OPTIONS
} = require('../lib/constants')

describe('Constants - CI Systems', () => {
  test('CI_SYSTEMS structure', () => {
    assert.ok(typeof CI_SYSTEMS === 'object', 'Should be an object')
    assert.ok(Object.keys(CI_SYSTEMS).length > 0, 'Should have CI systems')

    const expectedKeys = ['GitHub Actions', 'GitLab CI/CD', 'Jenkins', 'None']
    expectedKeys.forEach(key => {
      assert.ok(key in CI_SYSTEMS, `Should have ${key}`)
    })
  })
})

describe('Constants - C++ Addons', () => {
  test('KNOWN_CPP_ADDONS array', () => {
    assert.ok(Array.isArray(KNOWN_CPP_ADDONS), 'Should be an array')
    assert.ok(KNOWN_CPP_ADDONS.length > 0, 'Should have known addons')
    assert.ok(KNOWN_CPP_ADDONS.includes('node-sass'), 'Should include node-sass')
    assert.ok(KNOWN_CPP_ADDONS.includes('bcrypt'), 'Should include bcrypt')
  })
})

describe('Constants - File Exclusions', () => {
  test('DEFAULT_EXCLUSIONS array', () => {
    assert.ok(Array.isArray(DEFAULT_EXCLUSIONS), 'Should be an array')
    assert.ok(DEFAULT_EXCLUSIONS.length > 0, 'Should have exclusions')
    assert.ok(DEFAULT_EXCLUSIONS.includes('node_modules'), 'Should exclude node_modules')
    assert.ok(DEFAULT_EXCLUSIONS.includes('.git'), 'Should exclude .git')
  })
})

describe('Constants - Node.js Versions', () => {
  test('TARGET_LTS_VERSIONS array', () => {
    assert.ok(Array.isArray(TARGET_LTS_VERSIONS), 'Should be an array')
    assert.ok(TARGET_LTS_VERSIONS.length > 0, 'Should have target LTS versions')

    // Check that versions are objects with name and value
    TARGET_LTS_VERSIONS.forEach(version => {
      assert.ok(typeof version === 'object', 'Version should be an object')
      assert.ok('name' in version, 'Should have name property')
      assert.ok('value' in version, 'Should have value property')
    })
  })

  test('CURRENT_NODE_VERSIONS array', () => {
    assert.ok(Array.isArray(CURRENT_NODE_VERSIONS), 'Should be an array')
    assert.ok(CURRENT_NODE_VERSIONS.length > 0, 'Should have current Node versions')

    // Check that versions are objects with name and value
    CURRENT_NODE_VERSIONS.forEach(version => {
      assert.ok(typeof version === 'object', 'Version should be an object')
      assert.ok('name' in version, 'Should have name property')
      assert.ok('value' in version, 'Should have value property')
    })
  })
})

describe('Constants - Operating Systems', () => {
  test('PRODUCTION_OS_OPTIONS array', () => {
    assert.ok(Array.isArray(PRODUCTION_OS_OPTIONS), 'Should be an array')
    assert.ok(PRODUCTION_OS_OPTIONS.length > 0, 'Should have production OS options')
  })

  test('DEVELOPMENT_OS_OPTIONS array', () => {
    assert.ok(Array.isArray(DEVELOPMENT_OS_OPTIONS), 'Should be an array')
    assert.ok(DEVELOPMENT_OS_OPTIONS.length > 0, 'Should have development OS options')
  })
})

describe('Constants - File Size Limits', () => {
  test('FILE_SIZE_LIMITS structure', () => {
    assert.ok(typeof FILE_SIZE_LIMITS === 'object', 'Should be an object')
    assert.ok('packageJson' in FILE_SIZE_LIMITS, 'Should have packageJson limit')
    assert.ok('lockfile' in FILE_SIZE_LIMITS, 'Should have lockfile limit')

    // Check that limits are numbers
    assert.ok(typeof FILE_SIZE_LIMITS.packageJson === 'number', 'packageJson limit should be number')
    assert.ok(typeof FILE_SIZE_LIMITS.lockfile === 'number', 'lockfile limit should be number')
  })
})
