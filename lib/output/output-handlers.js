/**
 * Output handlers using strategy pattern
 */

/**
 * Base output handler interface
 */
class BaseOutputHandler {
  async handle (options) {
    throw new Error('handle method must be implemented')
  }
}

/**
 * File output handler - writes to file system
 */
class FileOutputHandler extends BaseOutputHandler {
  constructor (fileOps, promptRunner) {
    super()
    this.fileOps = fileOps
    this.promptRunner = promptRunner
  }

  async handle (options) {
    const { filePath, content, logger, forceOverwrite = false } = options
    const log = logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

    try {
      // Validate directory
      log.debug('Validating output directory')
      this.fileOps.validateDirectory(filePath)
      log.debug('Output directory validated')

      // Check if file exists and handle overwrite
      if (!forceOverwrite) {
        log.debug('Checking if output file exists')
        const fileExists = this.fileOps.checkFileExists(filePath)

        if (fileExists) {
          log.debug('Output file exists, prompting for overwrite')
          const shouldProceed = await this.promptRunner.promptOverwrite(filePath, logger)
          if (!shouldProceed) {
            log.warn('File overwrite cancelled by user')
            throw new Error('Operation cancelled by user.')
          }
          log.debug('File overwrite confirmed')
        }
      }

      // Write content to file
      log.debug('Writing output to file')
      this.fileOps.writeContent(filePath, content)
      log.info('Output file written successfully', { filePath, sizeBytes: content.length })

      return {
        success: true,
        filePath,
        sizeBytes: content.length
      }
    } catch (error) {
      log.error('File output failed', error)
      throw error
    }
  }
}

/**
 * Console output handler - writes to stdout
 */
class ConsoleOutputHandler extends BaseOutputHandler {
  async handle (options) {
    const { content, logger } = options
    const log = logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

    try {
      log.debug('Outputting to console')
      console.log(content)
      log.info('Output written to console successfully', { sizeBytes: content.length })

      return {
        success: true,
        destination: 'console',
        sizeBytes: content.length
      }
    } catch (error) {
      log.error('Console output failed', error)
      throw error
    }
  }
}

/**
 * Buffer output handler - stores in memory for testing
 */
class BufferOutputHandler extends BaseOutputHandler {
  constructor () {
    super()
    this.buffer = null
  }

  async handle (options) {
    const { content, logger } = options
    const log = logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

    try {
      log.debug('Storing output in buffer')
      this.buffer = content
      log.info('Output stored in buffer successfully', { sizeBytes: content.length })

      return {
        success: true,
        destination: 'buffer',
        sizeBytes: content.length
      }
    } catch (error) {
      log.error('Buffer output failed', error)
      throw error
    }
  }

  getBuffer () {
    return this.buffer
  }

  clearBuffer () {
    this.buffer = null
  }
}

/**
 * Output handler factory
 */
function createOutputHandler (type, fileOps, promptRunner) {
  switch (type) {
    case 'file':
      return new FileOutputHandler(fileOps, promptRunner)
    case 'console':
      return new ConsoleOutputHandler()
    case 'buffer':
      return new BufferOutputHandler()
    default:
      throw new Error(`Unknown output handler type: ${type}`)
  }
}

module.exports = {
  BaseOutputHandler,
  FileOutputHandler,
  ConsoleOutputHandler,
  BufferOutputHandler,
  createOutputHandler
}
