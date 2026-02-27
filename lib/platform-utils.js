/**
 * Cross-platform utility functions for Windows and Unix compatibility
 */

const { execSync } = require('node:child_process')
const path = require('node:path')
const os = require('node:os')

/**
 * Detect current platform
 */
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

/**
 * Get the appropriate command for finding executables
 * @returns {string} 'where' on Windows, 'which' on Unix
 */
function getWhichCommand () {
  return isWindows ? 'where' : 'which'
}

/**
 * Find executable location cross-platform
 * @param {string} executable - Name of executable to find
 * @returns {string|null} Path to executable or null if not found
 */
function findExecutable (executable) {
  try {
    const whichCmd = getWhichCommand()
    const result = execSync(`${whichCmd} ${executable}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()

    // On Windows, 'where' returns multiple lines if found in multiple locations
    // Take the first one
    return isWindows ? result.split('\n')[0].trim() : result
  } catch (error) {
    return null
  }
}

/**
 * Create a path pattern that works cross-platform
 * @param  {...string} parts - Path parts to join
 * @returns {RegExp} Regular expression for matching the path
 */
function createPathPattern (...parts) {
  // Escape backslashes for Windows paths in regex
  const escapedSep = path.sep.replace('\\', '\\\\')
  const pattern = parts.join(escapedSep)
  return new RegExp(pattern)
}

/**
 * Execute command with platform-specific handling
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @returns {string} Command output
 * @throws {Error} If command fails
 */
function execCrossPlatform (command, options = {}) {
  const defaultOptions = {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
    timeout: 2000,
    // Use shell on Windows to handle command chaining properly
    shell: isWindows,
    ...options
  }

  return execSync(command, defaultOptions).trim()
}

/**
 * Get default installation directories by platform
 * @param {string} tool - Tool name (e.g., 'node', 'npm')
 * @returns {Array<string>} Array of common installation paths
 */
function getDefaultInstallPaths (tool) {
  if (isWindows) {
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files'
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'

    switch (tool) {
      case 'node':
        return [
          path.join(programFiles, 'nodejs', 'node.exe'),
          path.join(programFilesX86, 'nodejs', 'node.exe'),
          path.join(process.env.APPDATA || '', 'nvm', 'node.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'volta', 'bin', 'node.exe')
        ]
      case 'git':
        return [
          path.join(programFiles, 'Git', 'bin', 'git.exe'),
          path.join(programFilesX86, 'Git', 'bin', 'git.exe')
        ]
      default:
        return []
    }
  } else {
    // Unix-like systems
    switch (tool) {
      case 'node':
        return [
          '/usr/local/bin/node',
          '/usr/bin/node',
          path.join(os.homedir(), '.nvm', 'versions', 'node'),
          path.join(os.homedir(), '.volta', 'bin', 'node')
        ]
      case 'git':
        return [
          '/usr/local/bin/git',
          '/usr/bin/git'
        ]
      default:
        return []
    }
  }
}

/**
 * Check if a command is available on the system
 * @param {string} command - Command to check
 * @returns {boolean} True if command is available
 */
function isCommandAvailable (command) {
  return findExecutable(command) !== null
}

/**
 * Get null device path for discarding output
 * @returns {string} '/dev/null' on Unix, 'NUL' on Windows
 */
function getNullDevice () {
  return isWindows ? 'NUL' : '/dev/null'
}

/**
 * Normalize path separators in a string to forward slashes
 * Useful for comparing paths cross-platform
 * @param {string} pathString - Path string to normalize
 * @returns {string} Normalized path with forward slashes
 */
function normalizePathSeparators (pathString) {
  return pathString.replace(/\\/g, '/')
}

/**
 * Check if version manager is supported on current platform
 * @param {string} manager - Version manager name (nvm, n, volta, fnm, asdf)
 * @returns {boolean} True if supported on current platform
 */
function isVersionManagerSupported (manager) {
  const support = {
    volta: true, // Works on all platforms
    fnm: true, // Works on all platforms
    nvm: !isWindows, // Unix only (nvm-windows is different)
    n: !isWindows, // Unix only
    asdf: !isWindows // Primarily Unix
  }

  return support[manager] || false
}

/**
 * Get environment variable with fallback
 * @param {string} name - Environment variable name
 * @param {string} fallback - Fallback value
 * @returns {string} Environment variable value or fallback
 */
function getEnvWithFallback (name, fallback = '') {
  return process.env[name] || fallback
}

/**
 * Extract version from path cross-platform
 * Handles both Unix and Windows path separators
 * @param {string} pathString - Path containing version
 * @param {RegExp} versionPattern - Pattern to match version (default: semantic version)
 * @returns {string|null} Extracted version or null
 */
function extractVersionFromPath (pathString, versionPattern = /(\d+\.\d+\.\d+)/) {
  const normalizedPath = normalizePathSeparators(pathString)
  const match = normalizedPath.match(versionPattern)
  return match ? match[1] : null
}

module.exports = {
  // Platform detection
  isWindows,
  isMac,
  isLinux,

  // Command utilities
  getWhichCommand,
  findExecutable,
  execCrossPlatform,
  isCommandAvailable,

  // Path utilities
  createPathPattern,
  normalizePathSeparators,
  extractVersionFromPath,
  getDefaultInstallPaths,

  // System utilities
  getNullDevice,
  getEnvWithFallback,
  isVersionManagerSupported
}
