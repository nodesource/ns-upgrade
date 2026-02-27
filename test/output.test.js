const { test, describe } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const { assembleOutput, getOutputPath, promptOverwrite } = require('../lib/output')

describe('Output - assembleOutput', () => {
  test('assembles output with valid data', () => {
    const userInput = {
      currentNodeVersion: 'v20.10.0',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      developmentOS: ['macOS'],
      ciEnvironment: 'github',
      additionalNotes: 'Test project'
    }

    const scanData = {
      projectInfo: {
        currentNodeVersion: 'v20.10.0',
        packageManager: { name: 'npm', version: '10.0.0' },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: { name: 'test' }, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: ['.github/workflows/ci.yml'],
        cppAddons: { gypFilesFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = {
      status: 'success',
      error: null,
      findings: []
    }

    const result = assembleOutput(userInput, scanData, analysisData)

    assert.ok(result, 'Should return output')
    assert.strictEqual(result.projectInfo.currentNodeVersion, 'v20.10.0')
    assert.strictEqual(result.projectInfo.targetLtsVersion, '20')
  })
})

describe('Output - getOutputPath', () => {
  test('returns provided path when absolute', () => {
    const absolutePath = '/absolute/path/output.json'
    const result = getOutputPath(absolutePath)
    assert.strictEqual(result, absolutePath)
  })

  test('resolves relative path', () => {
    const relativePath = 'output.json'
    const result = getOutputPath(relativePath)
    assert.ok(path.isAbsolute(result), 'Should return absolute path')
    assert.ok(result.endsWith('output.json'), 'Should end with filename')
  })
})

describe('Output - promptOverwrite', () => {
  test('returns true for non-existent file', async () => {
    const result = await promptOverwrite('/nonexistent/file.json')
    assert.strictEqual(result, true)
  })
})
