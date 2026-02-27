const fs = require('node:fs')
const { FILE_SIZE_LIMITS } = require('../constants')
const { truncateIfNeeded, validatePackageJson } = require('../utils')

/**
 * Read package.json content
 * @returns {Object} { content, isTruncated, warning }
 */
function readPackageJson () {
  const pkg = validatePackageJson()
  const content = fs.readFileSync('package.json', 'utf-8')

  const result = truncateIfNeeded(content, FILE_SIZE_LIMITS.packageJson)

  return {
    content: result.isTruncated ? JSON.parse(result.content) : pkg,
    isTruncated: result.isTruncated,
    warning: result.warning
  }
}

module.exports = { readPackageJson }
