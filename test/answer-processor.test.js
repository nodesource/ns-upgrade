const { test, describe } = require('node:test')
const assert = require('node:assert')
const { processAnswers } = require('../lib/prompts/answer-processor')

describe('Answer Processor - processAnswers', () => {
  test('processes standard answers', () => {
    const answers = {
      currentNodeVersion: '20',
      currentNodeVersionCustom: '',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      productionOSCustom: '',
      developmentOS: ['macOS'],
      developmentOSCustom: '',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: 'Test project'
    }

    const detectedNodeInfo = { version: 'v20.10.0', versionManager: null }
    const result = processAnswers(answers, detectedNodeInfo)

    assert.deepStrictEqual(result.currentNodeVersion, {
      detected: 'v20.10.0',
      selected: '20',
      versionManager: null
    })
    assert.strictEqual(result.targetLtsVersion, '20')
    assert.deepStrictEqual(result.productionOS, ['Ubuntu Linux'])
    assert.deepStrictEqual(result.developmentOS, ['macOS'])
    assert.strictEqual(result.ciEnvironment, 'github')
    assert.strictEqual(result.additionalNotes, 'Test project')
  })

  test('uses custom version when provided', () => {
    const answers = {
      currentNodeVersion: 'custom',
      currentNodeVersionCustom: '21',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      productionOSCustom: '',
      developmentOS: ['macOS'],
      developmentOSCustom: '',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: ''
    }

    const detectedNodeInfo = { version: 'v20.10.0', versionManager: null }
    const result = processAnswers(answers, detectedNodeInfo)
    assert.strictEqual(result.currentNodeVersion.selected, '21')
    assert.strictEqual(result.currentNodeVersion.detected, 'v20.10.0')
  })

  test('replaces Other with custom production OS', () => {
    const answers = {
      currentNodeVersion: '20',
      currentNodeVersionCustom: '',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux', 'Other'],
      productionOSCustom: 'Custom Linux',
      developmentOS: ['macOS'],
      developmentOSCustom: '',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: ''
    }

    const detectedNodeInfo = { version: 'v20.10.0', versionManager: null }
    const result = processAnswers(answers, detectedNodeInfo)
    assert.deepStrictEqual(result.productionOS, ['Ubuntu Linux', 'Custom Linux'])
    assert.strictEqual(result.ciEnvironment, 'github')
  })

  test('replaces Other with custom development OS', () => {
    const answers = {
      currentNodeVersion: '20',
      currentNodeVersionCustom: '',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      productionOSCustom: '',
      developmentOS: ['macOS', 'Other'],
      developmentOSCustom: 'Windows',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: ''
    }

    const detectedNodeInfo = { version: 'v20.10.0', versionManager: null }
    const result = processAnswers(answers, detectedNodeInfo)
    assert.deepStrictEqual(result.developmentOS, ['macOS', 'Windows'])
    assert.strictEqual(result.ciEnvironment, 'github')
  })

  test('handles multiple Other selections', () => {
    const answers = {
      currentNodeVersion: '20',
      currentNodeVersionCustom: '',
      targetLtsVersion: '20',
      productionOS: ['Other'],
      productionOSCustom: 'Custom Production',
      developmentOS: ['Other'],
      developmentOSCustom: 'Custom Development',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: ''
    }

    const detectedNodeInfo = { version: 'v20.10.0', versionManager: null }
    const result = processAnswers(answers, detectedNodeInfo)
    assert.deepStrictEqual(result.productionOS, ['Custom Production'])
    assert.deepStrictEqual(result.developmentOS, ['Custom Development'])
    assert.strictEqual(result.ciEnvironment, 'github')
  })

  test('trims additional notes', () => {
    const answers = {
      currentNodeVersion: '20',
      currentNodeVersionCustom: '',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      productionOSCustom: '',
      developmentOS: ['macOS'],
      developmentOSCustom: '',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: '  Test notes with spaces  '
    }

    const detectedNodeInfo = { version: 'v20.10.0', versionManager: null }
    const result = processAnswers(answers, detectedNodeInfo)
    assert.strictEqual(result.additionalNotes, 'Test notes with spaces')
    assert.strictEqual(result.ciEnvironment, 'github')
  })

  test('handles empty additional notes', () => {
    const answers = {
      currentNodeVersion: '20',
      currentNodeVersionCustom: '',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      productionOSCustom: '',
      developmentOS: ['macOS'],
      developmentOSCustom: '',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: ''
    }

    const detectedNodeInfo = { version: 'v20.10.0', versionManager: null }
    const result = processAnswers(answers, detectedNodeInfo)
    assert.strictEqual(result.additionalNotes, '')
  })
})
