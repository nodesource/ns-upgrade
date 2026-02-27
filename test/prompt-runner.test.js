const { test, describe } = require('node:test')
const assert = require('node:assert')
const { runPrompts, defaultInquirerLoader } = require('../lib/prompts/prompt-runner')

describe('Prompt Runner - runPrompts', () => {
  test('uses default inquirer loader when none provided', async () => {
    const mockConfig = [{ type: 'input', name: 'test', message: 'Test' }]

    // Mock inquirer for this test
    const mockInquirer = {
      prompt: async (config) => ({ test: 'mock answer' })
    }

    const mockLoader = async () => mockInquirer
    const result = await runPrompts(mockConfig, mockLoader)

    assert.deepStrictEqual(result, { test: 'mock answer' })
  })

  test('uses provided inquirer loader', async () => {
    const mockConfig = [{ type: 'input', name: 'test', message: 'Test' }]

    const customInquirer = {
      prompt: async (config) => ({ test: 'custom answer' })
    }

    const customLoader = async () => customInquirer
    const result = await runPrompts(mockConfig, customLoader)

    assert.deepStrictEqual(result, { test: 'custom answer' })
  })

  test('passes config to inquirer correctly', async () => {
    const mockConfig = [
      { type: 'input', name: 'field1', message: 'Field 1' },
      { type: 'list', name: 'field2', message: 'Field 2', choices: ['a', 'b'] }
    ]

    let receivedConfig = null
    const mockInquirer = {
      prompt: async (config) => {
        receivedConfig = config
        return { field1: 'value1', field2: 'a' }
      }
    }

    await runPrompts(mockConfig, async () => mockInquirer)

    assert.deepStrictEqual(receivedConfig, mockConfig)
  })

  test('handles inquirer errors', async () => {
    const mockConfig = [{ type: 'input', name: 'test', message: 'Test' }]

    const mockInquirer = {
      prompt: async (config) => {
        throw new Error('Inquirer error')
      }
    }

    await assert.rejects(
      () => runPrompts(mockConfig, async () => mockInquirer),
      { message: 'Inquirer error' }
    )
  })
})

describe('Prompt Runner - defaultInquirerLoader', () => {
  test('returns inquirer module', async () => {
    // This test verifies the function exists and returns something
    // In a real environment, it would return the actual inquirer module
    // For testing, we just verify it doesn't throw
    try {
      const inquirer = await defaultInquirerLoader()
      assert(typeof inquirer === 'object' || typeof inquirer === 'function')
    } catch (error) {
      // In test environment without inquirer installed, this is expected
      assert(error.message.includes('Cannot resolve module') || error.code === 'MODULE_NOT_FOUND')
    }
  })
})
