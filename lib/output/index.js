const { getOutputPath } = require('./file-operations')
const { createOutputHandler } = require('./output-handlers')
const { processOutput } = require('./output-processor')
const { promptOverwrite } = require('../prompts/prompt-overwrite')

/**
 * Create default logger if none provided
 * @param {Object} logger - Logger instance
 * @returns {Object} Logger instance
 */
function createLogger (logger) {
  return logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}

/**
 * Get output file path (backward compatibility)
 * @param {string} customPath - Custom output path (optional)
 * @returns {string} Output file path
 */
function getOutputPathCompat (customPath) {
  return getOutputPath(customPath)
}

/**
 * Assemble output object from collected data (backward compatibility)
 * @param {Object} userInput - User responses from prompts
 * @param {Object} scanData - Data from scanner
 * @param {Object} analysisData - Data from analyzer
 * @returns {Object} Assembled output object
 */
function assembleOutputCompat (userInput, scanData, analysisData) {
  const { assembleOutput } = require('./output-processor')
  return assembleOutput(userInput, scanData, analysisData)
}

/**
 * Check if output file exists and prompt for overwrite (backward compatibility)
 * @param {string} filePath - Output file path
 * @param {Object} logger - Logger instance
 * @returns {Promise<boolean>} True if should proceed, false if should cancel
 */
async function promptOverwriteCompat (filePath, logger = null) {
  return await promptOverwrite(filePath, logger)
}

/**
 * Generate and write output file using new modular architecture
 * @param {Object} options - Generation options
 * @param {Object} options.userInput - User responses
 * @param {Object} options.scanData - Scanner data
 * @param {Object} options.analysisData - Analyzer data
 * @param {string} options.outputPath - Custom output path (optional)
 * @param {Object} options.logger - Logger instance
 * @param {Object} options.fileOps - File operations (for testing)
 * @param {Object} options.promptRunner - Prompt runner (for testing)
 * @param {string} options.outputType - Output type: 'file', 'console', 'buffer'
 * @param {boolean} options.forceOverwrite - Skip overwrite prompt
 * @returns {Promise<Object>} Generation result
 * @throws {Error} If generation or validation fails
 */
async function generate (options) {
  const {
    userInput,
    scanData,
    analysisData,
    outputPath,
    logger = null,
    fileOps = null,
    promptRunner = null,
    outputType = 'file',
    forceOverwrite = false
  } = options

  const log = createLogger(logger)

  try {
    // Process and validate output data
    log.debug('Processing output data')
    const validatedOutput = processOutput(userInput, scanData, analysisData, logger)

    // Convert to JSON string
    const jsonContent = JSON.stringify(validatedOutput, null, 2)

    // Create output handler
    const defaultFileOps = fileOps || require('./file-operations')
    const defaultPromptRunner = promptRunner || { promptOverwrite }
    const handler = createOutputHandler(outputType, defaultFileOps, defaultPromptRunner)

    // Handle output based on type
    if (outputType === 'file') {
      const filePath = getOutputPath(outputPath)
      log.debug('Writing output to file', { filePath })

      const result = await handler.handle({
        filePath,
        content: jsonContent,
        logger,
        forceOverwrite
      })

      return {
        success: true,
        filePath,
        output: validatedOutput,
        ...result
      }
    } else {
      // Console or buffer output
      log.debug(`Outputting to ${outputType}`)
      const result = await handler.handle({
        content: jsonContent,
        logger
      })

      return {
        success: true,
        output: validatedOutput,
        outputType,
        ...result
      }
    }
  } catch (error) {
    log.error('Output generation failed', error)
    throw error
  }
}

module.exports = {
  // New modular API
  generate,
  createLogger,

  // Backward compatibility exports
  assembleOutput: assembleOutputCompat,
  getOutputPath: getOutputPathCompat,
  promptOverwrite: promptOverwriteCompat
}
