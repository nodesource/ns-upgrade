const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  getOutputPath,
  checkFileExists,
  validateDirectory,
  writeContent,
  defaultFileOps
} = require('../lib/output/file-operations')

describe('File Operations - getOutputPath', () => {
  test('returns custom path when provided', () => {
    const customPath = '/custom/path/output.json'
    const mockPathOps = {
      resolve: (path) => `/resolved/${path}`,
      join: () => '/default/path/nodesource-discovery.json'
    }

    const result = getOutputPath(customPath, mockPathOps)
    assert.strictEqual(result, '/resolved//custom/path/output.json')
  })

  test('returns default path when no custom path', () => {
    const mockPathOps = {
      resolve: (path) => `/resolved/${path}`,
      join: (...args) => args.join('/')
    }

    const result = getOutputPath(null, mockPathOps)
    assert.strictEqual(result, `${process.cwd()}/nodesource-discovery.json`)
  })

  test('uses default file ops when none provided', () => {
    const result = getOutputPath('/test/path')
    assert(result.includes('/test/path'))
  })
})

describe('File Operations - checkFileExists', () => {
  test('uses injected file operations', () => {
    const mockFileOps = {
      fileExists: (path) => path === 'existing.json'
    }

    assert.strictEqual(checkFileExists('existing.json', mockFileOps), true)
    assert.strictEqual(checkFileExists('missing.json', mockFileOps), false)
  })

  test('uses default file ops when none provided', () => {
    // Test with actual file system - use a file that should exist
    const result = checkFileExists(__filename)
    assert.strictEqual(typeof result, 'boolean')
  })
})

describe('File Operations - validateDirectory', () => {
  test('uses injected file operations', () => {
    let validatedPath = null
    const mockFileOps = {
      validateOutputDirectory: (path) => {
        validatedPath = path
      }
    }

    validateDirectory('/test/path', mockFileOps)
    assert.strictEqual(validatedPath, '/test/path')
  })

  test('throws when validation fails', () => {
    const mockFileOps = {
      validateOutputDirectory: (path) => {
        throw new Error('Invalid directory')
      }
    }

    assert.throws(() => validateDirectory('/invalid', mockFileOps), {
      message: 'Invalid directory'
    })
  })
})

describe('File Operations - writeContent', () => {
  test('uses injected file operations', () => {
    let writtenPath = null
    let writtenContent = null
    const mockFileOps = {
      writeFile: (path, content) => {
        writtenPath = path
        writtenContent = content
      }
    }

    writeContent('/test/file.json', 'test content', mockFileOps)
    assert.strictEqual(writtenPath, '/test/file.json')
    assert.strictEqual(writtenContent, 'test content')
  })

  test('throws when write fails', () => {
    const mockFileOps = {
      writeFile: (path, content) => {
        throw new Error('Write failed')
      }
    }

    assert.throws(() => writeContent('/test/file.json', 'content', mockFileOps), {
      message: 'Write failed'
    })
  })
})

describe('File Operations - defaultFileOps', () => {
  test('contains required operations', () => {
    assert.strictEqual(typeof defaultFileOps.validateOutputDirectory, 'function')
    assert.strictEqual(typeof defaultFileOps.writeFile, 'function')
    assert.strictEqual(typeof defaultFileOps.fileExists, 'function')
    assert.strictEqual(typeof defaultFileOps.resolve, 'function')
    assert.strictEqual(typeof defaultFileOps.join, 'function')
  })
})
