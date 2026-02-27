const fs = require('node:fs')
const { execSync } = require('node:child_process')

/**
 * Get version of a specific package manager using multiple strategies
 * @param {string} packageManagerName - Name of package manager (npm, pnpm, yarn)
 * @returns {string} Version string or 'unknown'
 */
function getPackageManagerVersion (packageManagerName) {
  try {
    // Strategy 1: Try to extract version from environment variable
    const userAgent = process.env.npm_config_user_agent
    if (userAgent) {
      const match = userAgent.match(new RegExp(`${packageManagerName}\\/(\\S+)`))
      if (match && match[1]) {
        return match[1]
      }
    }

    // Strategy 2: Execute package manager command directly
    // This is similar to how node version detection works
    try {
      const version = execSync(`${packageManagerName} -v`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 2000
      }).trim()

      // Clean up the version string (remove 'v' prefix if present)
      return version.replace(/^v/, '')
    } catch (error) {
      // Command execution failed
    }

    // Strategy 3: For npm specifically, try node's included npm
    // npm is bundled with Node.js, so we can try to find it
    if (packageManagerName === 'npm') {
      try {
        const version = execSync('node -e "console.log(require(\'child_process\').execSync(\'npm -v\', {encoding: \'utf-8\'}).trim())"', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 2000
        }).trim()

        return version.replace(/^v/, '')
      } catch (error) {
        // Fallback failed
      }
    }
  } catch (error) {
    // All strategies failed
  }

  return 'unknown'
}

/**
 * Detect package manager from lockfiles or environment
 * @returns {Object} { name, version }
 */
function detectPackageManager () {
  // Check for pnpm
  if (fs.existsSync('pnpm-lock.yaml')) {
    const version = getPackageManagerVersion('pnpm')
    return { name: 'pnpm', version }
  }

  // Check for yarn
  if (fs.existsSync('yarn.lock')) {
    const version = getPackageManagerVersion('yarn')
    return { name: 'yarn', version }
  }

  // Check for npm
  if (fs.existsSync('package-lock.json')) {
    const version = getPackageManagerVersion('npm')
    return { name: 'npm', version }
  }

  // Default to npm
  const version = getPackageManagerVersion('npm')
  return { name: 'npm', version }
}

module.exports = { detectPackageManager }
