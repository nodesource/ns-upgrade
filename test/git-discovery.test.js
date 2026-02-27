const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  checkGitAvailable,
  discoverGitDependency
} = require('../lib/scanner/git-discovery')

describe('Git Discovery - Git Availability', () => {
  test('checkGitAvailable returns promise', async () => {
    const hasGit = await checkGitAvailable()
    assert.ok(typeof hasGit === 'boolean', 'Should return a boolean')
  })

  test('checkGitAvailable detects git', async () => {
    const hasGit = await checkGitAvailable()
    // Most systems have git installed
    // Just verify it doesn't throw
    assert.ok(typeof hasGit === 'boolean', 'Should complete check')
  })
})

describe('Git Discovery - Module Exports', () => {
  test('discoverGitDependency function exists', () => {
    assert.ok(typeof discoverGitDependency === 'function', 'Should export discoverGitDependency function')
  })

  test('module exports', () => {
    const gitDiscovery = require('../lib/scanner/git-discovery')
    assert.ok(gitDiscovery.checkGitAvailable, 'Should export checkGitAvailable')
    assert.ok(gitDiscovery.discoverGitDependency, 'Should export discoverGitDependency')
  })
})
