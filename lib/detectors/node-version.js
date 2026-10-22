const { execSync } = require('node:child_process')
const { detectNodeVersionFromVolta } = require('./version-managers/volta')
const { detectNodeVersionFromNvm } = require('./version-managers/nvm')
const { detectNodeVersionFromFnm } = require('./version-managers/fnm')
const { detectNodeVersionFromAsdf } = require('./version-managers/asdf')
const { detectNodeVersionFromN } = require('./version-managers/n')
const { detectSystemNodeVersion } = require('./system-paths')
const fs = require('node:fs')
const path = require('node:path')

const VERSION_FILE_NAMES = ['.node-version', '.nvmrc']
const VERSION_FILE_PATTERN = /^\d+(\.\d+)?(\.\d+)?$/

/**
 * Read the project's pinned Node.js version (.node-version / .nvmrc)
 * directly, independent of whether any version manager is installed.
 * @param {string} cwd - Directory to read the version files from
 * @returns {string|null} Version like "v14.21.3", or null if absent or invalid
 */
function readProjectVersionFile (cwd = process.cwd()) {
  for (const fileName of VERSION_FILE_NAMES) {
    try {
      const versionFilePath = path.join(cwd, fileName)
      if (!fs.existsSync(versionFilePath)) continue
      const version = fs.readFileSync(versionFilePath, 'utf-8').trim().replace(/^v/, '')
      if (VERSION_FILE_PATTERN.test(version)) return `v${version}`
    } catch {
      // ignore unreadable version files
    }
  }
  return null
}

/**
 * Detect current Node.js version with detailed logging for each version manager
 * @param {Object} logger - Logger instance (optional)
 * @returns {Object} Detection result with version and manager info
 * @returns {string} returns.version - Detected Node.js version (e.g., "v20.10.0")
 * @returns {string|null} returns.versionManager - Version manager name if detected
 * @returns {Object} returns.detectionLog - Detailed log of detection attempts
 */
function detectNodeVersion (logger = null) {
  const log = logger || { debug: () => {}, info: () => {} }
  const detectionLog = {
    volta: null,
    nvm: null,
    fnm: null,
    asdf: null,
    n: null,
    versionFile: null,
    system: null,
    fallback: null
  }

  try {
    log.debug('Starting Node.js version detection')

    // Strategy 0: The project's pinned version (.node-version / .nvmrc) wins.
    // It is the only reliable project signal; a manager's active version is
    // often an unrelated global default.
    log.debug('Checking project version files')
    const versionFileVersion = readProjectVersionFile()
    detectionLog.versionFile = versionFileVersion ? { found: true, version: versionFileVersion } : { found: false }
    if (versionFileVersion) {
      log.info('Node.js version detected via project version file', { version: versionFileVersion })
      return { version: versionFileVersion, versionManager: null, detectionLog }
    }
    log.debug('Project version file not found or invalid')

    // Strategy 1: Check version managers when the project does not pin a version.
    // This ensures we get the user's actual managed version even when running via npx

    // Check Volta first (reads configuration files directly)
    log.debug('Checking Volta version manager')
    const voltaVersion = detectNodeVersionFromVolta()
    detectionLog.volta = voltaVersion ? { found: true, version: voltaVersion } : { found: false }
    if (voltaVersion) {
      log.info('Node.js version detected via Volta', { version: voltaVersion })
      return { version: voltaVersion, versionManager: 'volta', detectionLog }
    }
    log.debug('Volta not found or not configured')

    // Check nvm
    log.debug('Checking NVM version manager')
    const nvmVersion = detectNodeVersionFromNvm()
    detectionLog.nvm = nvmVersion ? { found: true, version: nvmVersion } : { found: false }
    if (nvmVersion) {
      log.info('Node.js version detected via NVM', { version: nvmVersion })
      return { version: nvmVersion, versionManager: 'nvm', detectionLog }
    }
    log.debug('NVM not found or not configured')

    // Check fnm
    log.debug('Checking FNM version manager')
    const fnmVersion = detectNodeVersionFromFnm()
    detectionLog.fnm = fnmVersion ? { found: true, version: fnmVersion } : { found: false }
    if (fnmVersion) {
      log.info('Node.js version detected via FNM', { version: fnmVersion })
      return { version: fnmVersion, versionManager: 'fnm', detectionLog }
    }
    log.debug('FNM not found or not configured')

    // Check asdf
    log.debug('Checking asdf version manager')
    const asdfVersion = detectNodeVersionFromAsdf()
    detectionLog.asdf = asdfVersion ? { found: true, version: asdfVersion } : { found: false }
    if (asdfVersion) {
      log.info('Node.js version detected via asdf', { version: asdfVersion })
      return { version: asdfVersion, versionManager: 'asdf', detectionLog }
    }
    log.debug('asdf not found or not configured')

    // Check n
    log.debug('Checking n version manager')
    const nVersion = detectNodeVersionFromN()
    detectionLog.n = nVersion ? { found: true, version: nVersion } : { found: false }
    if (nVersion) {
      log.info('Node.js version detected via n', { version: nVersion })
      return { version: nVersion, versionManager: 'n', detectionLog }
    }
    log.debug('n not found or not configured')

    // Strategy 2: Check if we're running under npx/npm and try system paths
    const isRunningUnderNpx = process.env.npm_execpath ||
                               process.env.npm_config_user_agent ||
                               process.version !== execSync('node -v', { encoding: 'utf-8' }).trim()

    if (isRunningUnderNpx) {
      log.debug('Running under npx, checking system paths')
      // Try to find node in common system paths, excluding npx cache
      const systemVersion = detectSystemNodeVersion()
      detectionLog.system = systemVersion ? { found: true, version: systemVersion } : { found: false }
      if (systemVersion) {
        log.info('Node.js version detected via system path', { version: systemVersion })
        return { version: systemVersion, versionManager: null, detectionLog }
      }
      log.debug('System Node.js not found in common paths')
    }

    // Strategy 3: Simple child process execution (works when not under npx)
    log.debug('Attempting direct node -v execution')
    const version = execSync('node -v', { encoding: 'utf-8' }).trim()
    detectionLog.fallback = { found: true, version, method: 'child_process' }
    log.info('Node.js version detected via child process', { version })
    return { version, versionManager: null, detectionLog }
  } catch (error) {
    // Final fallback to current process version
    log.debug('All detection methods failed, using process.version', { error: error.message })
    detectionLog.fallback = { found: true, version: process.version, method: 'process.version' }
    log.info('Node.js version fallback to process.version', { version: process.version })
    return { version: process.version, versionManager: null, detectionLog }
  }
}

module.exports = { detectNodeVersion, readProjectVersionFile }
