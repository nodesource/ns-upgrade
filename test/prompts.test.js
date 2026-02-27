const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  ask,
  collectAnswers,
  preparePromptContext,
  createLogger
} = require('../lib/prompts')

describe('Prompts - createLogger', () => {
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

describe('Prompts - preparePromptContext', () => {
  test('extracts major version from detected version', () => {
    const mockLogger = { debug: () => {} }
    const result = preparePromptContext('v20.10.0', mockLogger)
    assert.strictEqual(result.detectedMajor, '20')
  })

  test('handles null detected version', () => {
    const mockLogger = { debug: () => {} }
    // preparePromptContext now handles both string and object formats
    // Passing null should extract null for detectedMajor
    const result = preparePromptContext({ version: null }, mockLogger)
    assert.strictEqual(result.detectedMajor, null)
  })
})

describe('Prompts - collectAnswers', () => {
  test('collects answers using mocked inquirer', async () => {
    const mockLogger = { debug: () => {}, error: () => {} }
    const mockAnswers = {
      currentNodeVersion: '20',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      developmentOS: ['macOS'],
      ciEnvironment: 'GitHub Actions',
      additionalNotes: 'Test'
    }

    const mockInquirer = {
      prompt: async (config) => mockAnswers
    }

    const mockInquirerLoader = async () => mockInquirer
    const result = await collectAnswers('v20.10.0', mockLogger, mockInquirerLoader)

    assert.deepStrictEqual(result, mockAnswers)
  })

  test('handles inquirer errors', async () => {
    const mockLogger = { debug: () => {}, error: () => {} }
    const mockInquirer = {
      prompt: async (config) => {
        throw new Error('Inquirer failed')
      }
    }

    const mockInquirerLoader = async () => mockInquirer

    await assert.rejects(
      () => collectAnswers('v20.10.0', mockLogger, mockInquirerLoader),
      { message: 'Inquirer failed' }
    )
  })
})

describe('Prompts - ask', () => {
  test('processes complete user input', async () => {
    const mockLogger = { debug: () => {}, info: () => {}, error: () => {} }
    const mockRawAnswers = {
      currentNodeVersion: 'custom',
      currentNodeVersionCustom: '21',
      targetLtsVersion: '20',
      productionOS: ['Other'],
      productionOSCustom: 'Custom Linux',
      developmentOS: ['macOS'],
      developmentOSCustom: '',
      ciEnvironment: 'GitHub Actions',
      additionalNotes: '  Test notes  '
    }

    const mockInquirer = {
      prompt: async (config) => mockRawAnswers
    }

    const mockInquirerLoader = async () => mockInquirer
    const result = await ask('v20.10.0', mockLogger, mockInquirerLoader)

    // currentNodeVersion is now an object
    assert.strictEqual(result.currentNodeVersion.selected, '21')
    assert.strictEqual(result.currentNodeVersion.detected, 'v20.10.0')
    assert.strictEqual(result.targetLtsVersion, '20')
    assert.deepStrictEqual(result.productionOS, ['Custom Linux'])
    assert.deepStrictEqual(result.developmentOS, ['macOS'])
    assert.strictEqual(result.ciEnvironment, 'github')
    assert.strictEqual(result.additionalNotes, 'Test notes')
  })

  test('handles errors in collectAnswers', async () => {
    const mockLogger = { debug: () => {}, info: () => {}, error: () => {} }
    const mockInquirer = {
      prompt: async (config) => {
        throw new Error('Collection failed')
      }
    }

    const mockInquirerLoader = async () => mockInquirer

    await assert.rejects(
      () => ask('v20.10.0', mockLogger, mockInquirerLoader),
      { message: 'Collection failed' }
    )
  })

  test('works with default parameters', async () => {
    const mockAnswers = {
      currentNodeVersion: '20',
      targetLtsVersion: '20',
      productionOS: ['Ubuntu Linux'],
      developmentOS: ['macOS'],
      ciEnvironment: 'None',
      additionalNotes: ''
    }

    const mockInquirer = {
      prompt: async (config) => mockAnswers
    }

    const result = await ask(null, null, async () => mockInquirer)

    // currentNodeVersion is now an object
    assert.strictEqual(result.currentNodeVersion.selected, '20')
    assert.strictEqual(result.targetLtsVersion, '20')
  })
})

describe('Prompts - backward compatibility', () => {
  test('maintains original function signature', () => {
    const prompts = require('../lib/prompts')

    // Function should work without logger parameter (backward compatibility)
    assert.ok(typeof prompts.ask === 'function', 'Should export ask function')
    assert.ok(typeof prompts.collectAnswers === 'function', 'Should export collectAnswers function')
    assert.ok(typeof prompts.preparePromptContext === 'function', 'Should export preparePromptContext function')
    assert.ok(typeof prompts.createLogger === 'function', 'Should export createLogger function')
  })
})
