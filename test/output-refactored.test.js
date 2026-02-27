const { test, describe } = require('node:test')
const assert = require('node:assert')
const { generate, createLogger } = require('../lib/output')

describe('Output - generate with file output', () => {
  test('generates file output successfully', async () => {
    const userInput = {
      currentNodeVersion: { detected: 'v20.10.0', selected: '20', versionManager: null },
      targetLtsVersion: '22',
      developmentOS: 'macOS',
      productionOS: 'Ubuntu Linux',
      ciEnvironment: 'github',
      additionalNotes: 'Test project'
    }

    const scanData = {
      projectInfo: { packageManager: { name: 'npm', version: '1.0.0' }, hasWorkspaces: false },
      scannedData: {
        packageJson: { content: { name: 'test' }, isTruncated: false },
        allPackageJsons: [],
        lockfile: { name: 'package-lock.json', content: '', isTruncated: false },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = { status: 'success', error: null, findings: [] }

    const mockFileOps = {
      getOutputPath: () => '/test/output.json',
      validateDirectory: () => {},
      checkFileExists: () => false,
      writeContent: () => {}
    }

    const mockPromptRunner = {
      promptOverwrite: async () => true
    }

    const result = await generate({
      userInput,
      scanData,
      analysisData,
      outputPath: '/custom/path.json',
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      fileOps: mockFileOps,
      promptRunner: mockPromptRunner,
      outputType: 'file'
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.filePath, '/custom/path.json')
    assert.deepStrictEqual(result.output.projectInfo.currentNodeVersion, {
      detected: 'v20.10.0',
      selected: '20',
      versionManager: null
    })
    assert.strictEqual(result.output.projectInfo.targetLtsVersion, '22')
  })
})

describe('Output - generate with console output', () => {
  test('generates console output successfully', async () => {
    const userInput = {
      currentNodeVersion: { detected: 'v20.10.0', selected: '20', versionManager: null },
      targetLtsVersion: '22',
      developmentOS: 'macOS',
      productionOS: 'Ubuntu Linux',
      ciEnvironment: 'github',
      additionalNotes: 'Test project'
    }

    const scanData = {
      projectInfo: { packageManager: { name: 'npm', version: '1.0.0' }, hasWorkspaces: false },
      scannedData: {
        packageJson: { content: { name: 'test' }, isTruncated: false },
        allPackageJsons: [],
        lockfile: { name: 'package-lock.json', content: '', isTruncated: false },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = { status: 'success', error: null, findings: [] }

    const result = await generate({
      userInput,
      scanData,
      analysisData,
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      outputType: 'console'
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.destination, 'console')
    assert.deepStrictEqual(result.output.projectInfo.currentNodeVersion, {
      detected: 'v20.10.0',
      selected: '20',
      versionManager: null
    })
  })
})

describe('Output - generate with buffer output', () => {
  test('generates buffer output successfully', async () => {
    const userInput = {
      currentNodeVersion: { detected: 'v20.10.0', selected: '20', versionManager: null },
      targetLtsVersion: '22',
      developmentOS: 'macOS',
      productionOS: 'Ubuntu Linux',
      ciEnvironment: 'github',
      additionalNotes: 'Test project'
    }

    const scanData = {
      projectInfo: { packageManager: { name: 'npm', version: '1.0.0' }, hasWorkspaces: false },
      scannedData: {
        packageJson: { content: { name: 'test' }, isTruncated: false },
        allPackageJsons: [],
        lockfile: { name: 'package-lock.json', content: '', isTruncated: false },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = { status: 'success', error: null, findings: [] }

    const result = await generate({
      userInput,
      scanData,
      analysisData,
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      outputType: 'buffer'
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.destination, 'buffer')
    assert.deepStrictEqual(result.output.projectInfo.currentNodeVersion, {
      detected: 'v20.10.0',
      selected: '20',
      versionManager: null
    })
  })
})

describe('Output - createLogger', () => {
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
