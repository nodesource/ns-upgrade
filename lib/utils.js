const fs = require('node:fs')
const path = require('node:path')

/**
 * Validate and read package.json
 * @returns {Object} Parsed package.json content
 * @throws {Error} If file doesn't exist or is invalid JSON
 */
function validatePackageJson () {
  const packageJsonPath = path.join(process.cwd(), 'package.json')

  // Check if file exists
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('No package.json found. Please run this tool from the root of your Node.js project.')
  }

  // Check read permissions
  try {
    fs.accessSync(packageJsonPath, fs.constants.R_OK)
  } catch (error) {
    throw new Error(`Cannot read package.json: ${error.message}. Please check file permissions.`)
  }

  // Read and parse file
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('package.json contains invalid JSON syntax. Please check the file formatting.')
    } else {
      throw new Error(`Failed to read package.json: ${error.message}`)
    }
  }
}

/**
 * Truncate file content if it exceeds size limit
 * @param {string} content - File content
 * @param {number} limit - Size limit in bytes
 * @returns {Object} { content, isTruncated, warning }
 */
function truncateIfNeeded (content, limit) {
  const sizeInBytes = Buffer.byteLength(content, 'utf-8')

  if (sizeInBytes > limit) {
    const truncatedContent = content.substring(0, limit)
    const warning = `File truncated: exceeded ${limit / (1024 * 1024)}MB limit`
    return {
      content: truncatedContent,
      isTruncated: true,
      warning
    }
  }

  return {
    content,
    isTruncated: false,
    warning: null
  }
}

/**
 * Check if output directory exists and is writable
 * @param {string} outputPath - Output file path
 * @throws {Error} If directory doesn't exist or isn't writable
 */
function validateOutputDirectory (outputPath) {
  const dir = path.dirname(outputPath)

  if (!fs.existsSync(dir)) {
    throw new Error(`Output directory does not exist: ${dir}`)
  }

  try {
    fs.accessSync(dir, fs.constants.W_OK)
  } catch (error) {
    throw new Error(`Cannot write to output directory: ${dir}. ${error.message}`)
  }
}

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {boolean}
 */
function fileExists (filePath) {
  return fs.existsSync(filePath)
}

/**
 * Read file with error handling
 * @param {string} filePath - File path
 * @returns {string|null} File content or null if error
 */
function readFileIfExists (filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
  } catch (error) {
    // Silently fail
  }
  return null
}

/**
 * Write file with error handling
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @throws {Error} If write fails
 */
function writeFile (filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
  } catch (error) {
    throw new Error(`Cannot write to ${filePath}: ${error.message}`)
  }
}

module.exports = {
  validatePackageJson,
  truncateIfNeeded,
  validateOutputDirectory,
  fileExists,
  readFileIfExists,
  writeFile
}
