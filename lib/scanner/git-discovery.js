const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { exec } = require('node:child_process')
const { promisify } = require('node:util')
const { parseGitUrl } = require('./dependency-detection')

const execPromise = promisify(exec)

/**
 * Check if git binary is available
 * @returns {Promise<boolean>}
 */
async function checkGitAvailable () {
  try {
    await execPromise('git --version', { timeout: 5000 })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Execute command with timeout
 * @param {string} command - Command to execute
 * @param {Array<string>} args - Command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<string>} Command output
 */
async function execWithTimeout (command, args, options = {}) {
  const timeout = options.timeout || 30000
  const cwd = options.cwd || process.cwd()

  const fullCommand = `${command} ${args.join(' ')}`

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeout}ms: ${fullCommand}`))
    }, timeout)

    execPromise(fullCommand, { cwd, maxBuffer: 1024 * 1024 * 10 }) // 10MB buffer
      .then(({ stdout }) => {
        clearTimeout(timeoutId)
        resolve(stdout)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Discover package.json from a git dependency
 * @param {string} name - Dependency name
 * @param {string} gitUrl - Git URL
 * @returns {Promise<Object>} Discovery result
 */
async function discoverGitDependency (name, gitUrl) {
  const tempDir = path.join(
    os.tmpdir(),
    `ns-upgrade-git-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )

  try {
    // Parse git URL
    const { repo, ref } = parseGitUrl(gitUrl)

    // Build clone arguments
    const cloneArgs = ['clone', '--depth', '1', '--single-branch']

    // Add branch/tag if specified and not semver
    if (ref && !ref.startsWith('semver:')) {
      cloneArgs.push('--branch', ref)
    }

    cloneArgs.push(repo, tempDir)

    // Execute git clone with 30s timeout
    await execWithTimeout('git', cloneArgs, { timeout: 30000 })

    // Read package.json from cloned repo
    const pkgPath = path.join(tempDir, 'package.json')
    if (!fs.existsSync(pkgPath)) {
      return {
        success: false,
        warning: `No package.json found in git repository: ${name}`
      }
    }

    const content = fs.readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(content)

    return {
      success: true,
      path: gitUrl,
      content: pkg,
      isTruncated: false,
      isRoot: false,
      sourceType: 'git'
    }
  } catch (error) {
    // Provide helpful error messages
    let message = error.message
    if (message.includes('timed out')) {
      message = 'Git clone timed out (30s limit exceeded)'
    } else if (message.includes('Authentication failed') || message.includes('Permission denied')) {
      message = 'Authentication failed - check SSH keys or credentials'
    } else if (message.includes('not found')) {
      message = 'Repository not found or inaccessible'
    }

    return {
      success: false,
      warning: `Failed to clone git dependency ${name}: ${message}`
    }
  } finally {
    // Always cleanup temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch (cleanupError) {
      // Log but don't fail on cleanup errors
      console.warn(`Failed to cleanup temp dir ${tempDir}:`, cleanupError.message)
    }
  }
}

module.exports = {
  checkGitAvailable,
  execWithTimeout,
  discoverGitDependency
}
