const path = require('node:path')
const { validateOutputDirectory, writeFile, fileExists } = require('../utils')

/**
 * File operations with dependency injection for testing
 */

/**
 * Default file system operations
 */
const defaultFileOps = {
  validateOutputDirectory,
  writeFile,
  fileExists,
  resolve: path.resolve,
  join: path.join
}

/**
 * Get output file path using injected path operations
 * @param {string} customPath - Custom output path (optional)
 * @param {Object} pathOps - Path operations (for testing)
 * @returns {string} Output file path
 */
function getOutputPath (customPath, pathOps = defaultFileOps) {
  if (customPath) {
    return pathOps.resolve(customPath)
  }
  return pathOps.join(process.cwd(), 'nodesource-discovery.json')
}

/**
 * Check if output file exists using injected file operations
 * @param {string} filePath - Output file path
 * @param {Object} fileOps - File operations (for testing)
 * @returns {boolean} True if file exists
 */
function checkFileExists (filePath, fileOps = defaultFileOps) {
  return fileOps.fileExists(filePath)
}

/**
 * Validate output directory using injected file operations
 * @param {string} filePath - Output file path
 * @param {Object} fileOps - File operations (for testing)
 * @throws {Error} If validation fails
 */
function validateDirectory (filePath, fileOps = defaultFileOps) {
  fileOps.validateOutputDirectory(filePath)
}

/**
 * Write content to file using injected file operations
 * @param {string} filePath - Output file path
 * @param {string} content - File content
 * @param {Object} fileOps - File operations (for testing)
 */
function writeContent (filePath, content, fileOps = defaultFileOps) {
  fileOps.writeFile(filePath, content)
}

module.exports = {
  getOutputPath,
  checkFileExists,
  validateDirectory,
  writeContent,
  defaultFileOps
}
