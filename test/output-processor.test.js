const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  assembleOutput,
  validateOutput,
  processOutput,
  createLogger
} = require('../lib/output/output-processor')

describe('Output Processor - createLogger', () => {
  test('returns provided logger', () => {
    const customLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
    const result = createLogger(customLogger)
    assert.strictEqual(result, customLogger)
  })

  test('returns default logger when none provided', () => {
    const result = createLogger(null)
    assert.strictEqual(typeof result.info, 'function')
    assert.strictEqual(typeof result.warn, 'function')
    assert.strictEqual(typeof result.error, 'function')
    assert.strictEqual(typeof result.debug, 'function')
  })
})

describe('Output Processor - assembleOutput', () => {
  test('assembles complete output object', () => {
    const userInput = {
      currentNodeVersion: '20',
      targetLtsVersion: '22',
      developmentOS: ['macOS'],
      productionOS: ['Ubuntu Linux'],
      ciEnvironment: 'github',
      additionalNotes: 'Test project'
    }

    const scanData = {
      projectInfo: {
        packageManager: { name: 'npm', version: '1.0.0' },
        hasWorkspaces: false,
        monorepoTools: []
      },
      scannedData: {
        packageJson: { content: { name: 'test' }, isTruncated: false },
        lockfile: {
          name: 'package-lock.json',
          content: 'lock content',
          isTruncated: false
        },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = {
      status: 'success',
      error: null,
      findings: []
    }

    const result = assembleOutput(userInput, scanData, analysisData)

    assert.strictEqual(result.schemaVersion, '1.2.0')
    assert.strictEqual(result.projectInfo.currentNodeVersion, '20')
    assert.strictEqual(result.projectInfo.targetLtsVersion, '22')
    assert.strictEqual(result.projectInfo.packageManager.name, 'npm')
    assert.deepStrictEqual(result.projectInfo.environments.developmentOS, ['macOS'])
    assert.deepStrictEqual(result.projectInfo.environments.productionOS, ['Ubuntu Linux'])
    assert.strictEqual(result.projectInfo.environments.ciEnvironment, 'github')
    assert.strictEqual(result.projectInfo.hasWorkspaces, false)
    assert.deepStrictEqual(result.projectInfo.monorepoTools, [])
    assert.deepStrictEqual(result.scannedData.packageJson, { content: { name: 'test' }, isTruncated: false })
    assert.strictEqual(result.scannedData.lockfile.name, 'package-lock.json')
    assert.deepStrictEqual(result.staticApiAnalysis.status, 'success')
    assert.deepStrictEqual(result.warnings, [])
    assert.strictEqual(result.additionalNotes, 'Test project')
  })

  test('handles empty additional notes', () => {
    const userInput = {
      currentNodeVersion: '20',
      targetLtsVersion: '22',
      developmentOS: ['macOS'],
      productionOS: ['Ubuntu Linux'],
      ciEnvironment: 'github',
      additionalNotes: null
    }

    const scanData = {
      projectInfo: { packageManager: { name: 'npm', version: '1.0.0' }, hasWorkspaces: false, monorepoTools: [] },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: '', content: '', isTruncated: false },
        lockfilesDetected: [],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = { status: 'success', error: null, findings: [] }

    const result = assembleOutput(userInput, scanData, analysisData)
    assert.strictEqual(result.additionalNotes, '')
  })

  test('includes generated timestamp', () => {
    const userInput = { currentNodeVersion: '20', targetLtsVersion: '22', developmentOS: [], productionOS: [], ciEnvironment: 'none' }
    const scanData = { projectInfo: { packageManager: { name: 'npm', version: '1.0.0' }, hasWorkspaces: false, monorepoTools: [] }, scannedData: { packageJson: { content: {}, isTruncated: false }, allPackageJsons: [], lockfile: { name: '', content: '', isTruncated: false }, lockfilesDetected: [], ciConfigsFound: [], cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] }, monorepoConfigs: [] }, warnings: [] }
    const analysisData = { status: 'success', error: null, findings: [] }

    const result = assembleOutput(userInput, scanData, analysisData)

    assert.ok(result.generatedAt)
    assert.ok(new Date(result.generatedAt).getTime() > 0)
  })
})

describe('Output Processor - validateOutput', () => {
  test('validates correct output', () => {
    const validOutput = {
      schemaVersion: '1.2.0',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        currentNodeVersion: { detected: 'v20.10.0', selected: '20', versionManager: null },
        targetLtsVersion: '22',
        packageManager: { name: 'npm', version: '1.0.0' },
        environments: {
          developmentOS: ['macOS'],
          productionOS: ['Ubuntu Linux'],
          ciEnvironment: 'github'
        },

        hasWorkspaces: false,
        monorepoTools: []
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        allPackageJsons: [],
        lockfile: {
          name: 'package-lock.json',
          content: '',
          isTruncated: false
        },
        lockfilesDetected: [],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] },
        monorepoConfigs: []
      },
      staticApiAnalysis: {
        status: 'success',
        error: null,
        findings: []
      },
      warnings: [],
      additionalNotes: ''
    }

    const result = validateOutput(validOutput)
    assert.deepStrictEqual(result, validOutput)
  })

  test('throws validation error for invalid output', () => {
    const invalidOutput = {
      // Missing required fields
      schemaVersion: '1.2.0'
    }

    assert.throws(() => validateOutput(invalidOutput), {
      message: /Output validation failed/
    })
  })
})

describe('Output Processor - processOutput', () => {
  test('processes complete output successfully', () => {
    const userInput = {
      currentNodeVersion: { detected: 'v20.10.0', selected: '20', versionManager: null },
      targetLtsVersion: '22',
      developmentOS: 'macOS',
      productionOS: 'Ubuntu Linux',
      ciEnvironment: 'github',
      additionalNotes: 'Test'
    }
    const scanData = { projectInfo: { packageManager: { name: 'npm', version: '1.0.0' }, hasWorkspaces: false, monorepoTools: [] }, scannedData: { packageJson: { content: {}, isTruncated: false }, allPackageJsons: [], lockfile: { name: '', content: '', isTruncated: false }, lockfilesDetected: [], ciConfigsFound: [], cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] }, monorepoConfigs: [] }, warnings: [] }
    const analysisData = { status: 'success', error: null, findings: [] }

    const result = processOutput(userInput, scanData, analysisData)

    assert.strictEqual(result.schemaVersion, '1.2.0')
    assert.deepStrictEqual(result.projectInfo.currentNodeVersion, { detected: 'v20.10.0', selected: '20', versionManager: null })
    assert.strictEqual(result.additionalNotes, 'Test')
  })

  test('handles processing errors', () => {
    const invalidUserInput = { /* missing required fields */ }
    const scanData = { projectInfo: { packageManager: { name: 'npm', version: '1.0.0' }, hasWorkspaces: false, monorepoTools: [] }, scannedData: { packageJson: { content: {}, isTruncated: false }, allPackageJsons: [], lockfile: { name: '', content: '', isTruncated: false }, lockfilesDetected: [], ciConfigsFound: [], cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] }, monorepoConfigs: [] }, warnings: [] }
    const analysisData = { status: 'success', error: null, findings: [] }

    assert.throws(() => processOutput(invalidUserInput, scanData, analysisData))
  })
})
