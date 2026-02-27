const { test, describe } = require('node:test')
const assert = require('node:assert')
const sinon = require('sinon')
const fs = require('node:fs')
const childProcess = require('node:child_process')
const platformUtils = require('../lib/platform-utils')

describe('Version Managers Mocked - Module Imports', () => {
  test('nvm detector can be imported', () => {
    const { detectNodeVersionFromNvm } = require('../lib/detectors/version-managers/nvm')
    assert.ok(typeof detectNodeVersionFromNvm === 'function', 'Should be a function')
  })

  test('volta detector can be imported', () => {
    const { detectNodeVersionFromVolta } = require('../lib/detectors/version-managers/volta')
    assert.ok(typeof detectNodeVersionFromVolta === 'function', 'Should be a function')
  })

  test('fnm detector can be imported', () => {
    const { detectNodeVersionFromFnm } = require('../lib/detectors/version-managers/fnm')
    assert.ok(typeof detectNodeVersionFromFnm === 'function', 'Should be a function')
  })

  test('asdf detector can be imported', () => {
    const { detectNodeVersionFromAsdf } = require('../lib/detectors/version-managers/asdf')
    assert.ok(typeof detectNodeVersionFromAsdf === 'function', 'Should be a function')
  })

  test('n detector can be imported', () => {
    const { detectNodeVersionFromN } = require('../lib/detectors/version-managers/n')
    assert.ok(typeof detectNodeVersionFromN === 'function', 'Should be a function')
  })
})

describe('Version Managers Mocked - Default Behavior', () => {
  test('nvm returns null when not configured', () => {
    const originalNvmDir = process.env.NVM_DIR
    const originalNvmBin = process.env.NVM_BIN

    try {
      delete process.env.NVM_DIR
      delete process.env.NVM_BIN

      const { detectNodeVersionFromNvm } = require('../lib/detectors/version-managers/nvm')
      const version = detectNodeVersionFromNvm()
      assert.strictEqual(version, null, 'Should return null when NVM not configured')
    } finally {
      if (originalNvmDir) process.env.NVM_DIR = originalNvmDir
      if (originalNvmBin) process.env.NVM_BIN = originalNvmBin
    }
  })

  test('volta handles environment configuration', () => {
    const originalVoltaHome = process.env.VOLTA_HOME

    try {
      delete process.env.VOLTA_HOME

      const { detectNodeVersionFromVolta } = require('../lib/detectors/version-managers/volta')
      const version = detectNodeVersionFromVolta()
      // Volta might return null or detect system Node.js, both are valid
      assert.ok(version === null || typeof version === 'string', 'Should return null or version string')
    } finally {
      if (originalVoltaHome) process.env.VOLTA_HOME = originalVoltaHome
    }
  })

  test('fnm returns null when not configured', () => {
    const originalFnmDir = process.env.FNM_DIR
    const originalFnmMultishell = process.env.FNM_MULTISHELL_PATH

    try {
      delete process.env.FNM_DIR
      delete process.env.FNM_MULTISHELL_PATH

      const { detectNodeVersionFromFnm } = require('../lib/detectors/version-managers/fnm')
      const version = detectNodeVersionFromFnm()
      assert.strictEqual(version, null, 'Should return null when FNM not configured')
    } finally {
      if (originalFnmDir) process.env.FNM_DIR = originalFnmDir
      if (originalFnmMultishell) process.env.FNM_MULTISHELL_PATH = originalFnmMultishell
    }
  })

  test('asdf returns null when not configured', () => {
    const originalAsdfDir = process.env.ASDF_DIR

    try {
      delete process.env.ASDF_DIR

      const { detectNodeVersionFromAsdf } = require('../lib/detectors/version-managers/asdf')
      const version = detectNodeVersionFromAsdf()
      assert.strictEqual(version, null, 'Should return null when ASDF not configured')
    } finally {
      if (originalAsdfDir) process.env.ASDF_DIR = originalAsdfDir
    }
  })

  test('n returns null when not configured', () => {
    const originalNPrefix = process.env.N_PREFIX

    // Mock dependencies to ensure clean environment regardless of actual system state
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const findExecutableStub = sinon.stub(platformUtils, 'findExecutable')
    const execSyncStub = sinon.stub(childProcess, 'execSync')

    try {
      delete process.env.N_PREFIX

      // Configure mocks to simulate "not found" state
      existsSyncStub.returns(false)
      findExecutableStub.returns(null)
      execSyncStub.throws(new Error('Command failed'))

      const { detectNodeVersionFromN } = require('../lib/detectors/version-managers/n')
      const version = detectNodeVersionFromN()
      assert.strictEqual(version, null, 'Should return null when N not configured')
    } finally {
      if (originalNPrefix) process.env.N_PREFIX = originalNPrefix

      // Restore stubs
      existsSyncStub.restore()
      findExecutableStub.restore()
      execSyncStub.restore()
    }
  })
})

describe('Version Managers Mocked - Error Handling', () => {
  test('detectors handle missing environment gracefully', () => {
    // Test that all detectors can be called without crashing
    const detectors = [
      require('../lib/detectors/version-managers/nvm').detectNodeVersionFromNvm,
      require('../lib/detectors/version-managers/volta').detectNodeVersionFromVolta,
      require('../lib/detectors/version-managers/fnm').detectNodeVersionFromFnm,
      require('../lib/detectors/version-managers/asdf').detectNodeVersionFromAsdf,
      require('../lib/detectors/version-managers/n').detectNodeVersionFromN
    ]

    detectors.forEach(detector => {
      try {
        const result = detector()
        // Should not throw, result can be null or a version string
        assert.ok(result === null || typeof result === 'string', 'Should return null or string')
      } catch (error) {
        assert.fail(`Detector should not throw error: ${error.message}`)
      }
    })
  })
})
