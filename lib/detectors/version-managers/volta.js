const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execSync } = require('node:child_process')

/**
 * Try to detect Node.js version from Volta
 * @returns {string|null} Node.js version or null if not found
 */
function detectNodeVersionFromVolta () {
  try {
    const voltaHome = process.env.VOLTA_HOME || path.join(os.homedir(), '.volta')

    // Only proceed if Volta home exists
    if (!fs.existsSync(voltaHome)) {
      return null
    }

    // Strategy 1: Check project-level package.json volta pinning first
    try {
      const cwd = process.cwd()
      const pkgPath = path.join(cwd, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkgContent = fs.readFileSync(pkgPath, 'utf-8')
        const pkg = JSON.parse(pkgContent)
        if (pkg.volta && pkg.volta.node) {
          const version = pkg.volta.node
          return version.startsWith('v') ? version : `v${version}`
        }
      }
    } catch (error) {
      // Failed to read or parse package.json, continue to next strategy
    }

    // Strategy 2: Read Volta's platform.json for default/global Node version
    try {
      const platformPath = path.join(voltaHome, 'tools', 'user', 'platform.json')
      if (fs.existsSync(platformPath)) {
        const platformContent = fs.readFileSync(platformPath, 'utf-8')
        const platform = JSON.parse(platformContent)
        if (platform && platform.node && platform.node.runtime) {
          const version = platform.node.runtime
          return version.startsWith('v') ? version : `v${version}`
        }
      }
    } catch (error) {
      // Failed to read or parse platform.json, continue to next strategy
    }

    // Strategy 3: Try volta commands as fallback (might be affected by npx PATH)
    try {
      const version = execSync('volta list node --current --format plain', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 2000
      }).trim()

      if (version && version.match(/v?\d+\.\d+\.\d+/)) {
        return version.startsWith('v') ? version : `v${version}`
      }
    } catch (error) {
      // volta list command failed
    }
  } catch (error) {
    // Volta detection failed completely
  }
  return null
}

module.exports = { detectNodeVersionFromVolta }
