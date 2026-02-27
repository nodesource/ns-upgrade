const { test, describe } = require('node:test')
const assert = require('node:assert')
const { validate, validateSafe } = require('../lib/schema')

describe('Schema - validate Function', () => {
  test('validate with valid data', () => {
    const validData = {
      schemaVersion: '1.1.0',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        currentNodeVersion: {
          detected: 'v20.10.0',
          selected: '20',
          versionManager: null
        },
        targetLtsVersion: '20',
        packageManager: { name: 'npm', version: '10.0.0' },
        environments: {
          developmentOS: 'macOS',
          productionOS: 'Ubuntu Linux',
          ciEnvironment: 'github'
        },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      staticApiAnalysis: {
        status: 'success',
        error: null,
        findings: []
      },
      warnings: [],
      additionalNotes: ''
    }

    const result = validate(validData)
    assert.ok(result, 'Should return validated data')
    assert.strictEqual(result.schemaVersion, '1.1.0', 'Should preserve schemaVersion')
  })

  test('validate with missing generatedAt', () => {
    const invalidData = {
      schemaVersion: '1.1.0',
      projectInfo: {
        currentNodeVersion: {
          detected: 'v20.10.0',
          selected: '20',
          versionManager: null
        },
        targetLtsVersion: '20',
        packageManager: { name: 'npm', version: '10.0.0' },
        environments: {
          developmentOS: 'macOS',
          productionOS: 'Ubuntu Linux',
          ciEnvironment: 'github'
        },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: [],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      staticApiAnalysis: {
        status: 'success',
        error: null,
        findings: []
      },
      warnings: []
    }

    assert.throws(() => validate(invalidData), 'Should throw on missing generatedAt')
  })

  test('validate with invalid ciEnvironment', () => {
    const invalidData = {
      schemaVersion: '1.1.0',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        currentNodeVersion: {
          detected: 'v20.10.0',
          selected: '20',
          versionManager: null
        },
        targetLtsVersion: '20',
        packageManager: { name: 'npm', version: '10.0.0' },
        environments: {
          developmentOS: 'macOS',
          productionOS: 'Ubuntu Linux',
          ciEnvironment: 'invalid-ci'
        },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: [],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      staticApiAnalysis: {
        status: 'success',
        error: null,
        findings: []
      },
      warnings: []
    }

    assert.throws(() => validate(invalidData), 'Should throw on invalid ciEnvironment')
  })

  test('validate with additionalNotes exceeding max length', () => {
    const invalidData = {
      schemaVersion: '1.1.0',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        currentNodeVersion: {
          detected: 'v20.10.0',
          selected: '20',
          versionManager: null
        },
        targetLtsVersion: '20',
        packageManager: { name: 'npm', version: '10.0.0' },
        environments: {
          developmentOS: 'macOS',
          productionOS: 'Ubuntu Linux',
          ciEnvironment: 'github'
        },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: [],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      staticApiAnalysis: {
        status: 'success',
        error: null,
        findings: []
      },
      warnings: [],
      additionalNotes: 'a'.repeat(501)
    }

    assert.throws(() => validate(invalidData), 'Should throw on additionalNotes exceeding 500 chars')
  })
})

describe('Schema - validateSafe Function', () => {
  test('validateSafe with valid data', () => {
    const validData = {
      schemaVersion: '1.1.0',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        currentNodeVersion: {
          detected: 'v20.10.0',
          selected: '20',
          versionManager: null
        },
        targetLtsVersion: '20',
        packageManager: { name: 'npm', version: '10.0.0' },
        environments: {
          developmentOS: 'macOS',
          productionOS: 'Ubuntu Linux',
          ciEnvironment: 'github'
        },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: [],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      staticApiAnalysis: {
        status: 'success',
        error: null,
        findings: []
      },
      warnings: []
    }

    const result = validateSafe(validData)
    assert.strictEqual(result.success, true, 'Should return success true')
    assert.ok(result.data, 'Should return validated data')
  })

  test('validateSafe with invalid data', () => {
    const invalidData = { invalid: 'data' }

    const result = validateSafe(invalidData)
    assert.strictEqual(result.success, false, 'Should return success false')
    assert.ok(result.error, 'Should return error message')
  })
})
