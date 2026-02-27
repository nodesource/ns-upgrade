const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execSync } = require('node:child_process')

/**
 * Try to detect Node.js version from fnm (Fast Node Manager)
 * @returns {string|null} Node.js version or null if not found
 */
function detectNodeVersionFromFnm () {
  try {
    // Determine fnm directory (can be in different locations)
    const fnmDir = process.env.FNM_DIR ||
                   path.join(os.homedir(), '.fnm') ||
                   path.join(os.homedir(), '.local', 'share', 'fnm')

    // Only proceed if fnm directory exists
    if (!fs.existsSync(fnmDir)) {
      return null
    }

    // Strategy 1: Check FNM_MULTISHELL_PATH environment variable
    if (process.env.FNM_MULTISHELL_PATH) {
      const match = process.env.FNM_MULTISHELL_PATH.match(/v?(\d+\.\d+\.\d+)/)
      if (match) {
        return `v${match[1]}`
      }
    }

    // Strategy 2: Read .node-version or .nvmrc file in current directory
    try {
      const cwd = process.cwd()
      const nodeVersionFiles = ['.node-version', '.nvmrc']

      for (const fileName of nodeVersionFiles) {
        const versionFilePath = path.join(cwd, fileName)
        if (fs.existsSync(versionFilePath)) {
          const versionContent = fs.readFileSync(versionFilePath, 'utf-8').trim()
          // Remove 'v' prefix if present and validate
          const version = versionContent.replace(/^v/, '')
          if (version.match(/^\d+(\.\d+)?(\.\d+)?$/)) {
            return version.startsWith('v') ? version : `v${version}`
          }
        }
      }
    } catch (error) {
      // Failed to read version files
    }

    // Strategy 3: Read fnm's default version alias
    try {
      const aliasesPath = path.join(fnmDir, 'aliases', 'default')
      if (fs.existsSync(aliasesPath)) {
        const aliasContent = fs.readFileSync(aliasesPath, 'utf-8').trim()
        if (aliasContent.match(/^\d+\.\d+\.\d+$/)) {
          return `v${aliasContent}`
        }
      }
    } catch (error) {
      // Failed to read aliases
    }

    // Strategy 4: Try fnm command as fallback (might be affected by npx)
    try {
      const version = execSync('fnm current', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 2000
      }).trim()

      if (version && version.match(/v?\d+\.\d+\.\d+/)) {
        return version.startsWith('v') ? version : `v${version}`
      }
    } catch (error) {
      // fnm command failed
    }
  } catch (error) {
    // fnm detection failed completely
  }
  return null
}

module.exports = { detectNodeVersionFromFnm }
