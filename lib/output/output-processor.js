const { validate } = require('../schema')

/**
 * Output processing and validation logic
 */

/**
 * Create default logger if none provided
 * @param {Object} logger - Logger instance
 * @returns {Object} Logger instance
 */
function createLogger (logger) {
  return logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
}

/**
 * Assemble output object from collected data
 * @param {Object} userInput - User responses from prompts
 * @param {Object} scanData - Data from scanner
 * @param {Object} analysisData - Data from analyzer
 * @returns {Object} Assembled output object
 */
function assembleOutput (userInput, scanData, analysisData) {
  const output = {
    schemaVersion: '1.2.0',
    generatedAt: new Date().toISOString(),
    projectInfo: {
      currentNodeVersion: userInput.currentNodeVersion,
      targetLtsVersion: userInput.targetLtsVersion,
      packageManager: scanData.projectInfo.packageManager,
      environments: {
        developmentOS: userInput.developmentOS,
        productionOS: userInput.productionOS,
        ciEnvironment: userInput.ciEnvironment
      },
      hasWorkspaces: scanData.projectInfo.hasWorkspaces,
      monorepoTools: scanData.projectInfo.monorepoTools
    },
    scannedData: {
      packageJson: scanData.scannedData.packageJson,
      allPackageJsons: scanData.scannedData.allPackageJsons || [],
      lockfile: {
        name: scanData.scannedData.lockfile.name,
        content: scanData.scannedData.lockfile.content,
        isTruncated: scanData.scannedData.lockfile.isTruncated
      },
      lockfilesDetected: scanData.scannedData.lockfilesDetected,
      ciConfigsFound: scanData.scannedData.ciConfigsFound,
      cppAddons: scanData.scannedData.cppAddons,
      monorepoConfigs: scanData.scannedData.monorepoConfigs
    },
    staticApiAnalysis: {
      status: analysisData.status,
      error: analysisData.error,
      findings: analysisData.findings
    },
    warnings: scanData.warnings,
    additionalNotes: userInput.additionalNotes || ''
  }

  return output
}

/**
 * Validate output against schema
 * @param {Object} output - Output object to validate
 * @param {Object} logger - Logger instance
 * @returns {Object} Validated output object
 * @throws {Error} If validation fails
 */
function validateOutput (output, logger = null) {
  const log = createLogger(logger)

  try {
    log.debug('Validating output against schema')
    const validatedOutput = validate(output)
    log.info('Output validated against schema', { schemaVersion: validatedOutput.schemaVersion })
    return validatedOutput
  } catch (error) {
    log.error('Output validation failed', error)
    throw new Error(`Output validation failed: ${error.message}`)
  }
}

/**
 * Process and validate output data
 * @param {Object} userInput - User responses from prompts
 * @param {Object} scanData - Data from scanner
 * @param {Object} analysisData - Data from analyzer
 * @param {Object} logger - Logger instance
 * @returns {Object} Validated output object
 */
function processOutput (userInput, scanData, analysisData, logger = null) {
  const log = createLogger(logger)

  try {
    log.debug('Assembling output object')
    const output = assembleOutput(userInput, scanData, analysisData)
    log.info('Output object assembled')

    const validatedOutput = validateOutput(output, logger)
    return validatedOutput
  } catch (error) {
    log.error('Output processing failed', error)
    throw error
  }
}

module.exports = {
  assembleOutput,
  validateOutput,
  processOutput,
  createLogger
}
