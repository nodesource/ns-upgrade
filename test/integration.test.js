const { test, describe } = require('node:test')
const assert = require('node:assert')
const { validate } = require('../lib/schema')
const { assembleOutput } = require('../lib/output')
const { detectNodeVersion, detectPackageManager } = require('../lib/detectors')
const { buildEslintConfig } = require('../lib/scanner/analyzer')

describe('Integration - Complete Workflow', () => {
  test('Complete workflow data assembly', () => {
    // Detect Node version for the test
    const detectedVersion = detectNodeVersion()

    // Simulate user input (as it would come from processAnswers)
    const userInput = {
      currentNodeVersion: {
        detected: detectedVersion.version,
        selected: detectedVersion.version.match(/v?(\d+)/)[1], // Extract major version
        versionManager: detectedVersion.versionManager
      },
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      developmentOS: ['macOS'],
      ciEnvironment: 'github',
      additionalNotes: 'Integration test project'
    }

    // Simulate scanner data
    const scanData = {
      projectInfo: {
        nodeVersionInfo: detectNodeVersion(),
        packageManager: detectPackageManager(),
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: {
          content: {
            name: 'test-project',
            version: '1.0.0',
            dependencies: { express: '^4.0.0' }
          },
          isTruncated: false
        },
        lockfile: {
          name: 'package-lock.json',
          content: null,
          isTruncated: false
        },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: ['.github/workflows/ci.yml'],
        cppAddons: {
          gypFilesFound: [],
          cmakeListsFound: [],
          dependenciesFound: []
        }
      },
      warnings: []
    }

    // Simulate analyzer data
    const analysisData = {
      status: 'success',
      error: null,
      findings: []
    }

    // Assemble output
    const output = assembleOutput(userInput, scanData, analysisData)

    // Validate against schema
    const validatedOutput = validate(output)

    // Assertions
    assert.ok(validatedOutput, 'Should produce valid output')
    assert.strictEqual(validatedOutput.schemaVersion, '1.2.0', 'Should have correct schema version')
    assert.ok(validatedOutput.generatedAt, 'Should have generation timestamp')
    assert.strictEqual(validatedOutput.projectInfo.targetLtsVersion, '20', 'Should have target LTS version')
    assert.strictEqual(validatedOutput.projectInfo.environments.ciEnvironment, 'github', 'Should have CI environment')
    assert.strictEqual(validatedOutput.scannedData.packageJson.content.name, 'test-project', 'Should have package name')
    assert.strictEqual(validatedOutput.staticApiAnalysis.status, 'success', 'Should have success status')
  })
})

describe('Integration - ESLint Configuration', () => {
  test('ESLint configuration for different Node versions', () => {
    const versions = ['20', '22', '24']

    for (const version of versions) {
      const config = buildEslintConfig(version)
      assert.ok(config.overrideConfig, `Should have overrideConfig for Node ${version}`)
      assert.ok(Array.isArray(config.overrideConfig), `overrideConfig should be an array for Node ${version}`)
      assert.strictEqual(
        config.overrideConfig[0].rules['n/no-unsupported-features/es-syntax'][1].version,
        version,
        `Should configure ESLint for Node ${version}`
      )
    }
  })
})

describe('Integration - Multi-Platform Output', () => {
  test('Output with multiple OS selections', () => {
    const userInput = {
      currentNodeVersion: { detected: 'v22.0.0', selected: '22', versionManager: null },
      targetLtsVersion: '22',
      productionOS: ['Ubuntu Linux', 'Amazon Linux'],
      developmentOS: ['macOS', 'Windows 10/11'],
      ciEnvironment: 'jenkins',
      additionalNotes: 'Multi-platform project'
    }

    const scanData = {
      projectInfo: {
        nodeVersionInfo: { version: 'v22.0.0', versionManager: null },
        packageManager: { name: 'npm', version: '10.0.0' },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: ['Jenkinsfile'],
        cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = {
      status: 'success',
      error: null,
      findings: []
    }

    const output = assembleOutput(userInput, scanData, analysisData)
    const validatedOutput = validate(output)

    assert.strictEqual(validatedOutput.projectInfo.environments.productionOS.length, 2, 'Should have 2 production OSes')
    assert.strictEqual(validatedOutput.projectInfo.environments.developmentOS.length, 2, 'Should have 2 development OSes')
  })
})

describe('Integration - Analysis Findings', () => {
  test('Output with analysis findings', () => {
    const userInput = {
      currentNodeVersion: { detected: 'v20.10.0', selected: '20', versionManager: null },
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      developmentOS: ['macOS'],
      ciEnvironment: 'circleci',
      additionalNotes: ''
    }

    const scanData = {
      projectInfo: {
        nodeVersionInfo: { version: 'v20.10.0', versionManager: null },
        packageManager: { name: 'npm', version: '10.0.0' },
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'package-lock.json', content: null, isTruncated: false },
        lockfilesDetected: ['package-lock.json'],
        ciConfigsFound: ['.circleci/config.yml'],
        cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: ['node-sass'] }
      },
      warnings: ['File truncated due to size limit']
    }

    const analysisData = {
      status: 'success',
      error: null,
      findings: [
        { api: 'new Buffer()', file: 'src/legacy.js', line: 15 },
        { api: 'util.isArray()', file: 'src/utils.js', line: 42 }
      ]
    }

    const output = assembleOutput(userInput, scanData, analysisData)
    const validatedOutput = validate(output)

    assert.strictEqual(validatedOutput.staticApiAnalysis.findings.length, 2, 'Should have 2 findings')
    assert.ok(validatedOutput.warnings.includes('File truncated due to size limit'), 'Should include warnings')
    assert.ok(validatedOutput.scannedData.cppAddons.dependenciesFound.includes('node-sass'), 'Should detect node-sass')
  })
})

describe('Integration - Error Handling', () => {
  test('Output with timeout status', () => {
    const userInput = {
      currentNodeVersion: { detected: 'v24.0.0', selected: '24', versionManager: null },
      targetLtsVersion: '24',
      productionOS: ['Windows Server'],
      developmentOS: ['Windows 10/11'],
      ciEnvironment: 'aws',
      additionalNotes: 'Large codebase'
    }

    const scanData = {
      projectInfo: {
        nodeVersionInfo: { version: 'v24.0.0', versionManager: null },
        packageManager: { name: 'pnpm', version: '8.0.0' },
        hasWorkspaces: true
      },
      scannedData: {
        packageJson: { content: {}, isTruncated: false },
        lockfile: { name: 'pnpm-lock.yaml', content: null, isTruncated: false },
        lockfilesDetected: ['pnpm-lock.yaml'],
        ciConfigsFound: ['buildspec.yml'],
        cppAddons: { gypFilesFound: [], cmakeListsFound: [], dependenciesFound: [] }
      },
      warnings: []
    }

    const analysisData = {
      status: 'timeout',
      error: 'Static analysis timed out after 5 minutes.',
      findings: []
    }

    const output = assembleOutput(userInput, scanData, analysisData)
    const validatedOutput = validate(output)

    assert.strictEqual(validatedOutput.staticApiAnalysis.status, 'timeout', 'Should have timeout status')
    assert.ok(validatedOutput.staticApiAnalysis.error, 'Should have error message')
  })
})
