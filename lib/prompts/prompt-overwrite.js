/**
 * Prompt overwrite functionality with dependency injection
 */

/**
 * Default inquirer loader that imports inquirer dynamically
 * @returns {Promise<Object>} Inquirer module
 */
async function defaultInquirerLoader () {
  const inquirer = await import('inquirer')
  return inquirer.default
}

/**
 * Create default logger if none provided
 * @param {Object} logger - Logger instance
 * @returns {Object} Logger instance
 */
function createLogger (logger) {
  return logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}

/**
 * Check if output file exists and prompt for overwrite
 * @param {string} filePath - Output file path
 * @param {Object} logger - Logger instance
 * @param {Function} inquirerLoader - Inquirer loader function (for testing)
 * @param {Object} fileOps - File operations (for testing)
 * @returns {Promise<boolean>} True if should proceed, false if should cancel
 */
async function promptOverwrite (filePath, logger = null, inquirerLoader = defaultInquirerLoader, fileOps = null) {
  const log = createLogger(logger)

  // Use injected file operations or default
  const checkFileExists = fileOps ? fileOps.checkFileExists : require('../output/file-operations').checkFileExists

  if (!checkFileExists(filePath)) {
    log.debug('Output file does not exist, proceeding with creation')
    return true
  }

  try {
    log.debug('Output file exists, prompting for overwrite')

    const inquirer = await inquirerLoader()

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'File already exists. Overwrite?',
        default: false
      }
    ])

    log.info('User overwrite decision', { overwrite: answers.overwrite, filePath })
    return answers.overwrite
  } catch (error) {
    log.error('Failed to prompt for file overwrite', error)
    // If prompting fails, it's safer to not overwrite
    return false
  }
}

module.exports = {
  promptOverwrite,
  defaultInquirerLoader,
  createLogger
}
