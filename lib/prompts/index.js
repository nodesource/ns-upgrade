const { createPromptConfig } = require('./prompt-config')
const { runPrompts } = require('./prompt-runner')
const { processAnswers } = require('./answer-processor')
const { extractMajorVersion } = require('../validators')

/**
 * Create default logger if none provided
 * @param {Object} logger - Logger instance
 * @returns {Object} Logger instance
 */
function createLogger (logger) {
  return logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}

/**
 * Prepare prompt context from detected version
 * @param {Object|string} nodeVersionInfo - Detected Node.js version info (object) or version string (for backward compatibility)
 * @param {Object} logger - Logger instance
 * @returns {Object} Context object with detected major version
 */
function preparePromptContext (nodeVersionInfo, logger) {
  const log = createLogger(logger)

  // Support both old string format and new object format for backward compatibility, handle null
  const detectedNodeVersion = nodeVersionInfo === null || nodeVersionInfo === undefined
    ? null
    : typeof nodeVersionInfo === 'string'
      ? nodeVersionInfo
      : nodeVersionInfo.version

  log.debug('Preparing prompt context', { detectedNodeVersion })

  const detectedMajor = detectedNodeVersion === null ? null : extractMajorVersion(detectedNodeVersion)
  log.debug('Extracted major version', { detectedMajor })

  return { detectedMajor }
}

/**
 * Collect user answers using prompts
 * @param {Object|string} nodeVersionInfo - Detected Node.js version info (object) or version string (for backward compatibility)
 * @param {Object} logger - Logger instance
 * @param {Function} inquirerLoader - Inquirer loader function (for testing)
 * @returns {Promise<Object>} Raw user answers
 */
async function collectAnswers (nodeVersionInfo, logger, inquirerLoader) {
  const log = createLogger(logger)

  // Support both old string format and new object format, handle null
  const detectedNodeVersion = nodeVersionInfo === null || nodeVersionInfo === undefined
    ? null
    : typeof nodeVersionInfo === 'string'
      ? nodeVersionInfo
      : nodeVersionInfo.version

  try {
    log.debug('Starting user prompts', { nodeVersionInfo })

    const { detectedMajor } = preparePromptContext(nodeVersionInfo, logger)

    log.debug('Prompting user for input')
    const promptConfig = createPromptConfig(detectedNodeVersion, detectedMajor)
    const answers = await runPrompts(promptConfig, inquirerLoader)

    log.debug('User prompts completed', { answers })
    return answers
  } catch (error) {
    log.error('Failed to collect user input', error)
    throw error
  }
}

/**
 * Ask all questions and return user input
 * @param {Object|string} nodeVersionInfo - Detected Node.js version info object {version, versionManager} or version string (for backward compatibility)
 * @param {Object} logger - Logger instance
 * @param {Function} inquirerLoader - Inquirer loader function (for testing)
 * @returns {Promise<Object>} User responses
 */
async function ask (nodeVersionInfo = null, logger = null, inquirerLoader) {
  const log = createLogger(logger)

  try {
    const answers = await collectAnswers(nodeVersionInfo, logger, inquirerLoader)

    // Extract detected info for processAnswers, handle null
    const detectedInfo = nodeVersionInfo === null || nodeVersionInfo === undefined
      ? { version: null, versionManager: null }
      : typeof nodeVersionInfo === 'string'
        ? { version: nodeVersionInfo, versionManager: null }
        : { version: nodeVersionInfo.version, versionManager: nodeVersionInfo.versionManager }

    const processedAnswers = processAnswers(answers, detectedInfo)

    log.info('User input processed successfully', { processedAnswers })
    return processedAnswers
  } catch (error) {
    log.error('Failed to process user input', error)
    throw error
  }
}

module.exports = {
  ask,
  collectAnswers,
  preparePromptContext,
  createLogger
}
