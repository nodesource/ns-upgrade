const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  BaseOutputHandler,
  FileOutputHandler,
  ConsoleOutputHandler,
  BufferOutputHandler,
  createOutputHandler
} = require('../lib/output/output-handlers')

describe('Output Handlers - BaseOutputHandler', () => {
  test('throws error when handle is not implemented', async () => {
    const handler = new BaseOutputHandler()
    await assert.rejects(
      () => handler.handle({}),
      { message: 'handle method must be implemented' }
    )
  })
})

describe('Output Handlers - FileOutputHandler', () => {
  test('writes file successfully', async () => {
    const mockFileOps = {
      validateDirectory: () => {},
      checkFileExists: () => false,
      writeContent: () => {}
    }
    const mockPromptRunner = {
      promptOverwrite: async () => true
    }
    const handler = new FileOutputHandler(mockFileOps, mockPromptRunner)

    const result = await handler.handle({
      filePath: '/test/output.json',
      content: '{"test": "data"}',
      logger: { debug: () => {}, info: () => {} }
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.filePath, '/test/output.json')
    assert.strictEqual(result.sizeBytes, 16)
  })

  test('prompts for overwrite when file exists', async () => {
    let prompted = false
    const mockFileOps = {
      validateDirectory: () => {},
      checkFileExists: () => true,
      writeContent: () => {}
    }
    const mockPromptRunner = {
      promptOverwrite: async () => {
        prompted = true
        return true
      }
    }
    const handler = new FileOutputHandler(mockFileOps, mockPromptRunner)

    await handler.handle({
      filePath: '/test/output.json',
      content: '{"test": "data"}',
      logger: { debug: () => {}, info: () => {} }
    })

    assert.strictEqual(prompted, true)
  })

  test('cancels when user declines overwrite', async () => {
    const mockFileOps = {
      validateDirectory: () => {},
      checkFileExists: () => true,
      writeContent: () => {}
    }
    const mockPromptRunner = {
      promptOverwrite: async () => false
    }
    const handler = new FileOutputHandler(mockFileOps, mockPromptRunner)

    await assert.rejects(
      () => handler.handle({
        filePath: '/test/output.json',
        content: '{"test": "data"}',
        logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
      }),
      { message: 'Operation cancelled by user.' }
    )
  })

  test('skips overwrite prompt when forceOverwrite is true', async () => {
    let prompted = false
    const mockFileOps = {
      validateDirectory: () => {},
      checkFileExists: () => true,
      writeContent: () => {}
    }
    const mockPromptRunner = {
      promptOverwrite: async () => {
        prompted = true
        return true
      }
    }
    const handler = new FileOutputHandler(mockFileOps, mockPromptRunner)

    await handler.handle({
      filePath: '/test/output.json',
      content: '{"test": "data"}',
      logger: { debug: () => {}, info: () => {} },
      forceOverwrite: true
    })

    assert.strictEqual(prompted, false)
  })

  test('handles validation errors', async () => {
    const mockFileOps = {
      validateDirectory: () => {
        throw new Error('Invalid directory')
      },
      checkFileExists: () => false,
      writeContent: () => {}
    }
    const mockPromptRunner = {
      promptOverwrite: async () => true
    }
    const handler = new FileOutputHandler(mockFileOps, mockPromptRunner)

    await assert.rejects(
      () => handler.handle({
        filePath: '/invalid/path/output.json',
        content: '{"test": "data"}',
        logger: { debug: () => {}, info: () => {}, error: () => {} }
      }),
      { message: 'Invalid directory' }
    )
  })
})

describe('Output Handlers - ConsoleOutputHandler', () => {
  test('outputs to console successfully', async () => {
    let loggedContent = null
    const originalConsoleLog = console.log
    console.log = (content) => {
      loggedContent = content
    }

    const handler = new ConsoleOutputHandler()
    const result = await handler.handle({
      content: '{"test": "data"}',
      logger: { debug: () => {}, info: () => {} }
    })

    console.log = originalConsoleLog

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.destination, 'console')
    assert.strictEqual(result.sizeBytes, 16)
    assert.strictEqual(loggedContent, '{"test": "data"}')
  })
})

describe('Output Handlers - BufferOutputHandler', () => {
  test('stores content in buffer', async () => {
    const handler = new BufferOutputHandler()
    const result = await handler.handle({
      content: '{"test": "data"}',
      logger: { debug: () => {}, info: () => {} }
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.destination, 'buffer')
    assert.strictEqual(result.sizeBytes, 16)
    assert.strictEqual(handler.getBuffer(), '{"test": "data"}')
  })

  test('clears buffer', async () => {
    const handler = new BufferOutputHandler()

    await handler.handle({
      content: 'test content',
      logger: { debug: () => {}, info: () => {} }
    })

    assert.strictEqual(handler.getBuffer(), 'test content')

    handler.clearBuffer()
    assert.strictEqual(handler.getBuffer(), null)
  })
})

describe('Output Handlers - createOutputHandler Factory', () => {
  test('creates file handler', () => {
    const mockFileOps = {}
    const mockPromptRunner = {}
    const handler = createOutputHandler('file', mockFileOps, mockPromptRunner)

    assert(handler instanceof FileOutputHandler)
  })

  test('creates console handler', () => {
    const handler = createOutputHandler('console')
    assert(handler instanceof ConsoleOutputHandler)
  })

  test('creates buffer handler', () => {
    const handler = createOutputHandler('buffer')
    assert(handler instanceof BufferOutputHandler)
  })

  test('throws error for unknown type', () => {
    assert.throws(() => createOutputHandler('unknown'), {
      message: 'Unknown output handler type: unknown'
    })
  })
})
