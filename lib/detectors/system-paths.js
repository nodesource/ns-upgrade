const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execSync } = require('node:child_process')

/**
 * Try to find system Node.js version by checking common installation paths
 * and filtering out npx cache directories
 * @returns {string|null} Node.js version or null if not found
 */
function detectSystemNodeVersion () {
  try {
    const platform = os.platform()
    const commonPaths = []

    // Build list of common Node.js installation paths based on OS
    if (platform === 'linux' || platform === 'darwin') {
      commonPaths.push(
        '/usr/local/bin/node',
        '/usr/bin/node',
        '/opt/homebrew/bin/node', // macOS ARM Homebrew
        '/home/linuxbrew/.linuxbrew/bin/node',
        path.join(os.homedir(), '.local/bin/node')
      )
    } else if (platform === 'win32') {
      commonPaths.push(
        'C:\\Program Files\\nodejs\\node.exe',
        'C:\\Program Files (x86)\\nodejs\\node.exe',
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'nodejs', 'node.exe')
      )
    }

    // Try each path
    for (const nodePath of commonPaths) {
      if (fs.existsSync(nodePath)) {
        try {
          const version = execSync(`"${nodePath}" -v`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
          }).trim()

          if (version && version.match(/v\d+\.\d+\.\d+/)) {
            return version
          }
        } catch (error) {
          // Try next path
          continue
        }
      }
    }
  } catch (error) {
    // System detection failed
  }
  return null
}

module.exports = { detectSystemNodeVersion }
