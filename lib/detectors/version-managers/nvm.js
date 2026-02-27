const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execSync } = require('node:child_process')
const { isWindows, isVersionManagerSupported } = require('../../platform-utils')

/**
 * Try to detect Node.js version from nvm (Node Version Manager)
 * @returns {string|null} Node.js version or null if not found
 */
function detectNodeVersionFromNvm () {
  try {
    const nvmDir = process.env.NVM_DIR || path.join(os.homedir(), '.nvm')

    // Only proceed if nvm directory exists
    if (!fs.existsSync(nvmDir)) {
      return null
    }

    // Strategy 1: Check NVM_BIN environment variable (most reliable when set)
    if (process.env.NVM_BIN) {
      const match = process.env.NVM_BIN.match(/v(\d+\.\d+\.\d+)/)
      if (match) {
        return `v${match[1]}`
      }
    }

    // Strategy 2: Read default alias file
    try {
      const defaultAliasPath = path.join(nvmDir, 'alias', 'default')
      if (fs.existsSync(defaultAliasPath)) {
        const aliasContent = fs.readFileSync(defaultAliasPath, 'utf-8').trim()
        // Could be a version like "20.10.0" or another alias like "lts/iron"
        if (aliasContent.match(/^\d+\.\d+\.\d+$/)) {
          return `v${aliasContent}`
        }
        // Try to resolve alias to version
        const aliasPath = path.join(nvmDir, 'alias', aliasContent)
        if (fs.existsSync(aliasPath)) {
          const resolvedVersion = fs.readFileSync(aliasPath, 'utf-8').trim()
          if (resolvedVersion.match(/^\d+\.\d+\.\d+$/)) {
            return `v${resolvedVersion}`
          }
        }
      }
    } catch (error) {
      // Failed to read alias files
    }

    // Strategy 3: Check current symlink
    try {
      const nvmCurrentPath = path.join(nvmDir, 'current')
      if (fs.existsSync(nvmCurrentPath)) {
        const versionPath = fs.readlinkSync(nvmCurrentPath)
        const versionMatch = versionPath.match(/v?(\d+\.\d+\.\d+)/)
        if (versionMatch) {
          return `v${versionMatch[1]}`
        }
      }
    } catch (error) {
      // Failed to read symlink
    }

    // Strategy 4: Try nvm commands as fallback (Unix only - nvm requires bash)
    // Note: nvm is not supported on Windows. Windows users should use nvm-windows (different tool)
    if (!isWindows && isVersionManagerSupported('nvm')) {
      try {
        const nvmScript = path.join(nvmDir, 'nvm.sh')
        if (fs.existsSync(nvmScript)) {
          const version = execSync(`bash -c ". ${nvmScript} && nvm current"`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 2000
          }).trim()

          if (version && version !== 'system' && version !== 'none' && version.match(/v?\d+\.\d+\.\d+/)) {
            return version.startsWith('v') ? version : `v${version}`
          }
        }
      } catch (error) {
        // nvm command failed
      }
    }
  } catch (error) {
    // nvm detection failed completely
  }
  return null
}

module.exports = { detectNodeVersionFromNvm }
