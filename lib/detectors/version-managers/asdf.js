const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execSync } = require('node:child_process')
const { isWindows } = require('../../platform-utils')

/**
 * Try to detect Node.js version from asdf (universal version manager)
 * @returns {string|null} Node.js version or null if not found
 */
function detectNodeVersionFromAsdf () {
  // ASDF is primarily Unix-only, limited Windows support
  if (isWindows) {
    return null
  }

  try {
    const asdfDir = process.env.ASDF_DIR ||
                    path.join(os.homedir(), '.asdf') ||
                    path.join(os.homedir(), '.local', 'share', 'asdf')

    // Only proceed if asdf directory exists
    if (!fs.existsSync(asdfDir)) {
      return null
    }

    // Strategy 1: Read .tool-versions file in current directory
    try {
      const cwd = process.cwd()
      const toolVersionsPath = path.join(cwd, '.tool-versions')
      if (fs.existsSync(toolVersionsPath)) {
        const content = fs.readFileSync(toolVersionsPath, 'utf-8')
        const lines = content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('nodejs ')) {
            const version = trimmed.replace('nodejs ', '').trim()
            if (version.match(/^\d+(\.\d+)?(\.\d+)?$/)) {
              return version.startsWith('v') ? version : `v${version}`
            }
          }
        }
      }
    } catch (error) {
      // Failed to read .tool-versions
    }

    // Strategy 2: Read global .tool-versions
    try {
      const globalToolVersionsPath = path.join(os.homedir(), '.tool-versions')
      if (fs.existsSync(globalToolVersionsPath)) {
        const content = fs.readFileSync(globalToolVersionsPath, 'utf-8')
        const lines = content.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('nodejs ')) {
            const version = trimmed.replace('nodejs ', '').trim()
            if (version.match(/^\d+(\.\d+)?(\.\d+)?$/)) {
              return version.startsWith('v') ? version : `v${version}`
            }
          }
        }
      }
    } catch (error) {
      // Failed to read global .tool-versions
    }

    // Strategy 3: Try asdf command as fallback
    try {
      const version = execSync('asdf current nodejs', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 2000
      }).trim()

      // Output format is like "nodejs 20.10.0 /path/to/.tool-versions"
      const match = version.match(/nodejs\s+(\d+\.\d+\.\d+)/)
      if (match) {
        return `v${match[1]}`
      }
    } catch (error) {
      // asdf command failed
    }
  } catch (error) {
    // asdf detection failed completely
  }
  return null
}

module.exports = { detectNodeVersionFromAsdf }
