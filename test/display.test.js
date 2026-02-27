const { test, describe } = require('node:test')
const assert = require('node:assert')
const { displayJSON } = require('../lib/display')

describe('Display - displayJSON', () => {
  test('displays JSON without throwing errors', () => {
    const sampleData = {
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        currentNodeVersion: 'v20.10.0',
        targetLtsVersion: '22',
        hasWorkspaces: false
      },
      scannedData: {
        packageJson: { content: { name: 'test' } },
        lockfilesDetected: ['package-lock.json'],
        allPackageJsons: [],
        ciConfigsFound: [],
        cppAddons: { gypFilesFound: [] }
      },
      staticApiAnalysis: {
        status: 'success',
        findings: []
      },
      warnings: ['Test warning'],
      additionalNotes: 'Test notes'
    }

    // Should not throw
    assert.doesNotThrow(() => {
      displayJSON(sampleData)
    })
  })

  test('handles minimal data structure', () => {
    const minimalData = {
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString()
    }

    assert.doesNotThrow(() => {
      displayJSON(minimalData)
    })
  })

  test('respects maxDepth option', () => {
    const deepData = {
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        level1: {
          level2: {
            level3: {
              level4: 'deep value'
            }
          }
        }
      }
    }

    assert.doesNotThrow(() => {
      displayJSON(deepData, { maxDepth: 2 })
    })
  })
})
