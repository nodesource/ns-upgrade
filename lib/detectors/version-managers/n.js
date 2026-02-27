const fs = require('node:fs')
const path = require('node:path')
const { isWindows } = require('../../platform-utils')
const platformUtils = require('../../platform-utils')
const childProcess = require('node:child_process')

/**
 * Try to detect Node.js version from n (Node.js version manager by TJ)
 * @returns {string|null} Node.js version or null if not found
 */
function detectNodeVersionFromN () {
  // N version manager is Unix-only, not supported on Windows
  if (isWindows) {
    return null
  }

  try {
    // n uses N_PREFIX environment variable or defaults to /usr/local (Unix only)
    const nPrefix = process.env.N_PREFIX || '/usr/local'
    const nDir = path.join(nPrefix, 'n', 'versions', 'node')

    // Only proceed if n directory exists
    if (!fs.existsSync(nDir)) {
      return null
    }

    // Strategy 1: Check N_NODE_PATH environment variable
    if (process.env.N_NODE_PATH) {
      const match = process.env.N_NODE_PATH.match(/v?(\d+\.\d+\.\d+)/)
      if (match) {
        return `v${match[1]}`
      }
    }

    // Strategy 2: Read .n-node-version or .node-version file in current directory
    try {
      const cwd = process.cwd()
      const versionFiles = ['.n-node-version', '.node-version', '.nvmrc']

      for (const fileName of versionFiles) {
        const versionFilePath = path.join(cwd, fileName)
        if (fs.existsSync(versionFilePath)) {
          const versionContent = fs.readFileSync(versionFilePath, 'utf-8').trim()
          // Remove 'v' prefix if present and validate
          const version = versionContent.replace(/^v/, '').replace(/^node\//, '')
          if (version.match(/^\d+(\.\d+)?(\.\d+)?$/)) {
            return version.startsWith('v') ? version : `v${version}`
          }
        }
      }
    } catch (error) {
      // Failed to read version files
    }

    // Strategy 3: Find the most recently modified version directory (active version)
    try {
      if (fs.existsSync(nDir)) {
        const versions = fs.readdirSync(nDir)
          .filter(v => v.match(/^\d+\.\d+\.\d+$/))
          .map(v => {
            const versionPath = path.join(nDir, v)
            const stats = fs.statSync(versionPath)
            return { version: v, mtime: stats.mtime }
          })
          .sort((a, b) => b.mtime - a.mtime)

        if (versions.length > 0) {
          return `v${versions[0].version}`
        }
      }
    } catch (error) {
      // Failed to read n versions directory
    }

    // Strategy 4: Check where node points to n-managed version (cross-platform)
    try {
      const nodePath = platformUtils.findExecutable('node')
      if (nodePath) {
        const normalizedPath = platformUtils.normalizePathSeparators(nodePath)
        if (normalizedPath.includes('/n/versions/node/')) {
          const version = platformUtils.extractVersionFromPath(normalizedPath)
          if (version) {
            return `v${version}`
          }
        }
      }
    } catch (error) {
      // Failed to find node executable
    }

    // Strategy 5: Try n command as fallback (simplified, no shell redirection)
    try {
      const version = childProcess.execSync('n bin', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 2000
      }).trim()

      const extractedVersion = platformUtils.extractVersionFromPath(platformUtils.normalizePathSeparators(version))
      if (extractedVersion) {
        return `v${extractedVersion}`
      }
    } catch (error) {
      // n command failed
    }
  } catch (error) {
    // n detection failed completely
  }
  return null
}

module.exports = { detectNodeVersionFromN }
