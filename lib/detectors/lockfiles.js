const fs = require('node:fs')
const { FILE_SIZE_LIMITS } = require('../constants')
const { truncateIfNeeded } = require('../utils')

/**
 * Detect lockfiles with priority order
 * @returns {Object} { selected, detected }
 */
function detectLockfiles () {
  const lockfiles = [
    { name: 'pnpm-lock.yaml', path: 'pnpm-lock.yaml' },
    { name: 'yarn.lock', path: 'yarn.lock' },
    { name: 'package-lock.json', path: 'package-lock.json' }
  ]

  const detected = []
  let selected = null

  for (const lockfile of lockfiles) {
    if (fs.existsSync(lockfile.path)) {
      detected.push(lockfile.name)
      if (!selected) {
        selected = lockfile
      }
    }
  }

  return { selected, detected }
}

/**
 * Read lockfile content
 * @param {Object} lockfile - Lockfile object with name and path
 * @returns {Object} { content, isTruncated, warning }
 */
function readLockfile (lockfile) {
  if (!lockfile) {
    return { content: null, isTruncated: false, warning: null }
  }

  try {
    const content = fs.readFileSync(lockfile.path, 'utf-8')
    const result = truncateIfNeeded(content, FILE_SIZE_LIMITS.lockfile)

    return {
      content: result.isTruncated ? result.content : content,
      isTruncated: result.isTruncated,
      warning: result.warning
    }
  } catch (error) {
    return { content: null, isTruncated: false, warning: `Failed to read ${lockfile.name}` }
  }
}

module.exports = {
  detectLockfiles,
  readLockfile
}
