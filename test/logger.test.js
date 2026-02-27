const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { createLogger, createNoOpLogger } = require('../lib/logger')

describe('Logger - No-Op Logger', () => {
  test('Create no-op logger when path is null', () => {
    const logger = createLogger(null)

    assert.strictEqual(logger.enabled, false)

    // Verify no-op methods don't throw
    logger.info('test')
    logger.error('test')
    logger.warn('test')
    logger.debug('test')
    logger.startOperation('test')
    logger.endOperation('test')
    logger.close()
  })

  test('disabled logger does not write to file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-upgrade-test-'))
    const logPath = path.join(tempDir, 'disabled.log')
    const logger = createLogger(null) // Pass null to get a no-op logger

    logger.info('This should not be written')
    logger.warn('This should not be written')
    logger.error('This should not be written')

    // File should not exist
    assert.strictEqual(fs.existsSync(logPath), false, 'Log file should not exist for disabled logger')
    assert.strictEqual(logger.enabled, false, 'Logger should be disabled')

    // Cleanup
    fs.rmdirSync(tempDir)
  })

  test('createNoOpLogger returns no-op logger', () => {
    const logger = createNoOpLogger()

    assert.strictEqual(logger.enabled, false)

    // Verify all methods exist and don't throw
    logger.info('test')
    logger.error('test')
    logger.warn('test')
    logger.debug('test')
    logger.startOperation('test')
    logger.endOperation('test')
    logger.close()
  })
})

describe('Logger - Data Handling', () => {
  test('handles circular references in data', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-upgrade-test-'))
    const logPath = path.join(tempDir, 'circular.log')
    const logger = createLogger(logPath)

    // Create circular reference
    const obj = { name: 'test' }
    obj.self = obj

    logger.info('Testing circular reference', obj)

    logger.close()

    const content = fs.readFileSync(logPath, 'utf-8')
    assert.ok(content.includes('Testing circular reference'), 'Should log the message')
    assert.ok(content.includes('Unable to stringify data') || content.includes('circular'), 'Should handle circular reference')

    // Cleanup
    fs.unlinkSync(logPath)
    fs.rmdirSync(tempDir)
  })

  test('logs objects with complex data', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-upgrade-test-'))
    const logPath = path.join(tempDir, 'complex.log')
    const logger = createLogger(logPath)

    const complexData = {
      nested: {
        deep: {
          value: 123
        }
      },
      array: [1, 2, 3],
      string: 'test'
    }

    logger.info('Complex data test', complexData)

    logger.close()

    const content = fs.readFileSync(logPath, 'utf-8')
    assert.ok(content.includes('Complex data test'), 'Should log the message')
    assert.ok(content.includes('nested'), 'Should include nested data')

    // Cleanup
    fs.unlinkSync(logPath)
    fs.rmdirSync(tempDir)
  })
})

describe('Logger - File Operations', () => {
  test('Write log entries to file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-upgrade-test-'))
    const logPath = path.join(tempDir, 'test.log')

    try {
      const logger = createLogger(logPath)

      assert.strictEqual(logger.enabled, true)

      // Write various log entries
      logger.info('Test info message', { key: 'value' })
      logger.warn('Test warning message')
      logger.error('Test error message', new Error('Test error'))
      logger.debug('Test debug message')

      logger.startOperation('Test Operation')
      logger.endOperation('Test Operation', true)

      logger.close()

      // Verify log file exists
      assert.ok(fs.existsSync(logPath))

      // Read and verify content
      const content = fs.readFileSync(logPath, 'utf8')

      // Check for expected content
      assert.ok(content.includes('Node.js Upgrade Advisor Log'))
      assert.ok(content.includes('[INFO] Test info message'))
      assert.ok(content.includes('[WARN] Test warning message'))
      assert.ok(content.includes('[ERROR] Test error message'))
      assert.ok(content.includes('[DEBUG] Test debug message'))
      assert.ok(content.includes('Starting operation: Test Operation'))
      assert.ok(content.includes('Completed operation: Test Operation [SUCCESS]'))
      assert.ok(content.includes('Data:'))
      assert.ok(content.includes('"key": "value"'))
    } finally {
      // Cleanup
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath)
      }
      fs.rmdirSync(tempDir)
    }
  })

  test('Handle errors gracefully', () => {
    const logger = createLogger('/invalid/path/that/does/not/exist/test.log')

    // Should not throw, but log to console
    logger.info('This should not crash')
    logger.close()
  })
})

describe('Logger - Timestamps and Formatting', () => {
  test('Format timestamps and elapsed time', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-upgrade-test-'))
    const logPath = path.join(tempDir, 'test.log')

    try {
      const logger = createLogger(logPath)

      logger.info('First message')

      // Wait a bit
      const start = Date.now()
      while (Date.now() - start < 100) {
        // Busy wait
      }

      logger.info('Second message')
      logger.close()

      const content = fs.readFileSync(logPath, 'utf8')

      // Check for ISO timestamp format
      assert.ok(content.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/))

      // Check for elapsed time format
      assert.ok(content.match(/\[INFO\] First message/))
      assert.ok(content.match(/\[INFO\] Second message/))
    } finally {
      // Cleanup
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath)
      }
      fs.rmdirSync(tempDir)
    }
  })
})
