const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  promptOverwrite,
  defaultInquirerLoader,
  createLogger
} = require('../lib/prompts/prompt-overwrite')

describe('Prompt Overwrite - createLogger', () => {
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

describe('Prompt Overwrite - promptOverwrite', () => {
  test('returns true when file does not exist', async () => {
    const mockFileOps = {
      checkFileExists: () => false
    }

    const result = await promptOverwrite(
      '/nonexistent/file.json',
      { debug: () => {} },
      defaultInquirerLoader,
      mockFileOps
    )

    assert.strictEqual(result, true)
  })

  test('prompts when file exists and user confirms', async () => {
    const mockFileOps = {
      checkFileExists: () => true
    }

    const mockInquirer = {
      prompt: async (questions) => ({ overwrite: true })
    }

    const mockInquirerLoader = async () => mockInquirer

    const result = await promptOverwrite(
      '/existing/file.json',
      { debug: () => {}, info: () => {} },
      mockInquirerLoader,
      mockFileOps
    )

    assert.strictEqual(result, true)
  })

  test('prompts when file exists and user declines', async () => {
    const mockFileOps = {
      checkFileExists: () => true
    }

    const mockInquirer = {
      prompt: async (questions) => ({ overwrite: false })
    }

    const mockInquirerLoader = async () => mockInquirer

    const result = await promptOverwrite(
      '/existing/file.json',
      { debug: () => {}, info: () => {} },
      mockInquirerLoader,
      mockFileOps
    )

    assert.strictEqual(result, false)
  })

  test('uses default file operations when none provided', async () => {
    const mockInquirer = {
      prompt: async (questions) => ({ overwrite: true })
    }

    const mockInquirerLoader = async () => mockInquirer

    // Test with a file that definitely doesn't exist
    const result = await promptOverwrite(
      '/definitely/nonexistent/file.json',
      { debug: () => {} },
      mockInquirerLoader,
      null
    )

    assert.strictEqual(result, true)
  })

  test('handles inquirer errors gracefully', async () => {
    const mockFileOps = {
      checkFileExists: () => true
    }

    const mockInquirer = {
      prompt: async (questions) => {
        throw new Error('Inquirer failed')
      }
    }

    const mockInquirerLoader = async () => mockInquirer

    const result = await promptOverwrite(
      '/existing/file.json',
      { debug: () => {}, error: () => {} },
      mockInquirerLoader,
      mockFileOps
    )

    // Should return false (safe default) when prompting fails
    assert.strictEqual(result, false)
  })

  test('handles inquirer loader errors', async () => {
    const mockFileOps = {
      checkFileExists: () => true
    }

    const mockInquirerLoader = async () => {
      throw new Error('Loader failed')
    }

    const result = await promptOverwrite(
      '/existing/file.json',
      { debug: () => {}, error: () => {} },
      mockInquirerLoader,
      mockFileOps
    )

    // Should return false (safe default) when loader fails
    assert.strictEqual(result, false)
  })
})

describe('Prompt Overwrite - defaultInquirerLoader', () => {
  test('returns inquirer module', async () => {
    // This test verifies the function exists and returns something
    // In a real environment, it would return the actual inquirer module
    try {
      const inquirer = await defaultInquirerLoader()
      assert(typeof inquirer === 'object' || typeof inquirer === 'function')
    } catch (error) {
      // In test environment without inquirer installed, this is expected
      assert(error.message.includes('Cannot resolve module') || error.code === 'MODULE_NOT_FOUND')
    }
  })
})
