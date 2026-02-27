/**
 * Validation utilities for user input prompts
 * These functions are extracted to make them easily testable
 */

/**
 * Validate custom Node.js version input
 * @param {string} answer - User input version
 * @returns {string|boolean} Error message or true if valid
 */
function validateCustomNodeVersion (answer) {
  const trimmed = answer.trim()
  if (trimmed.length === 0) {
    return 'Please provide a version number.'
  }
  // Validate that it's a number or version string
  // Allow: 21, 23, 21.5.0, v21, v23, v21.5.0
  if (!/^\d+(\.\d+)?(\.\d+)?$/.test(trimmed) && !/^v?\d+(\.\d+)?(\.\d+)?$/.test(trimmed)) {
    return 'Please provide a valid version number (e.g., 21, 23, 21.5.0).'
  }
  return true
}

/**
 * validate custom OS input
 * @param {string} answer - User input OS
 * @returns {string|boolean} Error message or true if valid
 */
function validateCustomOS (answer) {
  if (answer.trim().length === 0) {
    return 'Please provide a value.'
  }
  return true
}

/**
 * Validate additional notes length
 * @param {string} answer - User input notes
 * @returns {string|boolean} Error message or true if valid
 */
function validateAdditionalNotes (answer) {
  if (answer.length > 500) {
    return 'Please keep your notes to 500 characters or less.'
  }
  return true
}

/**
 * Validate that at least one OS is selected
 * @param {Array<string>} answer - Selected OS options
 * @returns {string|boolean} Error message or true if valid
 */
function validateOSSelection (answer) {
  if (answer.length === 0) {
    return 'Please select at least one option.'
  }
  return true
}

/**
 * Extract major version from detected version string
 * @param {string} detectedNodeVersion - Detected Node.js version (e.g., "v20.10.0")
 * @returns {string|null} Major version number or null
 */
function extractMajorVersion (detectedNodeVersion) {
  if (!detectedNodeVersion) {
    return null
  }
  const match = detectedNodeVersion.match(/^v?(\d+)/)
  return match ? match[1] : null
}

module.exports = {
  validateCustomNodeVersion,
  validateCustomOS,
  validateAdditionalNotes,
  validateOSSelection,
  extractMajorVersion
}
