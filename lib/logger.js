const fs = require('node:fs')
const path = require('node:path')

/**
 * Logger class for writing detailed operation logs
 */
class Logger {
  constructor (logFilePath) {
    this.logFilePath = logFilePath ? path.resolve(logFilePath) : null
    this.enabled = !!logFilePath
    this.startTime = Date.now()

    if (this.enabled) {
      // Initialize log file with header
      this._writeToFile(`=== Node.js Upgrade Advisor Log ===\nStarted at: ${new Date().toISOString()}\n\n`)
    }
  }

  /**
   * Write content to log file
   * @param {string} content - Content to write
   * @private
   */
  _writeToFile (content) {
    if (!this.enabled) return

    try {
      fs.appendFileSync(this.logFilePath, content, 'utf8')
    } catch (error) {
      // Fail silently to not interrupt the CLI operation
      console.warn(`Warning: Failed to write to log file: ${error.message}`)
    }
  }

  /**
   * Format log entry with timestamp
   * @param {string} level - Log level (INFO, ERROR, WARN, DEBUG)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @returns {string} Formatted log entry
   * @private
   */
  _formatEntry (level, message, data) {
    const timestamp = new Date().toISOString()
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    let entry = `[${timestamp}] [+${elapsed}s] [${level}] ${message}\n`

    if (data) {
      try {
        entry += `  Data: ${JSON.stringify(data, null, 2)}\n`
      } catch (error) {
        entry += `  Data: [Unable to stringify data: ${error.message}]\n`
      }
    }

    return entry + '\n'
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {Object} data - Optional additional data
   */
  info (message, data) {
    if (!this.enabled) return
    this._writeToFile(this._formatEntry('INFO', message, data))
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or data
   */
  error (message, error) {
    if (!this.enabled) return

    const errorData = error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      : error

    this._writeToFile(this._formatEntry('ERROR', message, errorData))
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} data - Optional additional data
   */
  warn (message, data) {
    if (!this.enabled) return
    this._writeToFile(this._formatEntry('WARN', message, data))
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} data - Optional additional data
   */
  debug (message, data) {
    if (!this.enabled) return
    this._writeToFile(this._formatEntry('DEBUG', message, data))
  }

  /**
   * Log operation start
   * @param {string} operation - Operation name
   */
  startOperation (operation) {
    if (!this.enabled) return
    this._writeToFile(`\n${'='.repeat(60)}\n`)
    this.info(`Starting operation: ${operation}`)
    this._writeToFile(`${'='.repeat(60)}\n\n`)
  }

  /**
   * Log operation completion
   * @param {string} operation - Operation name
   * @param {boolean} success - Whether operation succeeded
   */
  endOperation (operation, success = true) {
    if (!this.enabled) return
    const status = success ? 'SUCCESS' : 'FAILED'
    this.info(`Completed operation: ${operation} [${status}]`)
    this._writeToFile(`${'-'.repeat(60)}\n\n`)
  }

  /**
   * Close logger and write footer
   */
  close () {
    if (!this.enabled) return

    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    this._writeToFile(`\n${'='.repeat(60)}\n`)
    this._writeToFile(`Finished at: ${new Date().toISOString()}\n`)
    this._writeToFile(`Total elapsed time: ${elapsed}s\n`)
    this._writeToFile(`${'='.repeat(60)}\n`)
  }
}

/**
 * Create a no-op logger when logging is disabled
 */
function createNoOpLogger () {
  return {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    startOperation: () => {},
    endOperation: () => {},
    close: () => {},
    enabled: false
  }
}

/**
 * Create logger instance
 * @param {string|null} logFilePath - Path to log file or null to disable logging
 * @returns {Logger} Logger instance
 */
function createLogger (logFilePath) {
  return logFilePath ? new Logger(logFilePath) : createNoOpLogger()
}

module.exports = {
  Logger,
  createLogger,
  createNoOpLogger
}
