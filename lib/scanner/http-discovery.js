const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const https = require('node:https')
const tar = require('tar')
const { execWithTimeout } = require('./git-discovery')
const { isCommandAvailable } = require('../platform-utils')

/**
 * Fetch content from URL with timeout
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} Response body
 */
function fetchWithTimeout (url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeout}ms`))
    }, timeout)

    https.get(url, {
      headers: {
        'User-Agent': 'NodeSource-Upgrade-Discovery-CLI'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(timeoutId)
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
        return
      }

      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        clearTimeout(timeoutId)
        resolve(data)
      })
    }).on('error', (error) => {
      clearTimeout(timeoutId)
      reject(error)
    })
  })
}

/**
 * Discover package.json from GitHub shorthand dependency
 * @param {string} name - Dependency name
 * @param {string} shorthand - GitHub shorthand (user/repo or user/repo#ref)
 * @returns {Promise<Object>} Discovery result
 */
async function discoverGitHubShorthand (name, shorthand) {
  try {
    // Parse shorthand: "user/repo#ref" or "user/repo"
    const [userRepo, ref = 'HEAD'] = shorthand.split('#')
    const [owner, repo] = userRepo.split('/')

    if (!owner || !repo) {
      return {
        success: false,
        warning: `Invalid GitHub shorthand format: ${shorthand}`
      }
    }

    // Build list of URLs to try (in order)
    const urls = []

    // If specific ref provided, try it first
    if (ref !== 'HEAD') {
      urls.push(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/package.json`)
    }

    // Fallback URLs for common default branches
    urls.push(
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/package.json`
    )

    // Try each URL until one succeeds
    let lastError = null
    for (const url of urls) {
      try {
        const content = await fetchWithTimeout(url, 10000)
        const pkg = JSON.parse(content)

        return {
          success: true,
          path: `github:${shorthand}`,
          content: pkg,
          isTruncated: false,
          isRoot: false,
          sourceType: 'github-shorthand'
        }
      } catch (error) {
        lastError = error
        // Continue to next URL
        continue
      }
    }

    // All URLs failed
    let message = lastError?.message || 'Unknown error'
    if (message.includes('404')) {
      message = 'Repository not found or package.json does not exist (may be private)'
    } else if (message.includes('403')) {
      message = 'Access forbidden (likely rate limited or private repository)'
    } else if (message.includes('timed out')) {
      message = 'Request timed out (10s limit exceeded)'
    }

    return {
      success: false,
      warning: `Failed to fetch GitHub shorthand dependency ${name}: ${message}`
    }
  } catch (error) {
    return {
      success: false,
      warning: `Failed to process GitHub shorthand dependency ${name}: ${error.message}`
    }
  }
}

/**
 * Download file from URL with size limit and timeout
 * @param {string} url - URL to download
 * @param {string} destPath - Destination file path
 * @param {number} maxSize - Maximum file size in bytes
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
function downloadWithLimit (url, destPath, maxSize = 10 * 1024 * 1024, timeout = 30000, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('Too many redirects'))
      return
    }

    const timeoutId = setTimeout(() => {
      reject(new Error(`Download timed out after ${timeout}ms`))
    }, timeout)

    const request = (url.startsWith('https://') ? https : require('node:http')).get(url, (res) => {
      // Handle Redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timeoutId)
        // Resolve relative URLs
        let newUrl = res.headers.location
        try {
          // If newUrl is relative, this will throw or return something we can't use directly without base
          // But new URL(relative, base) works.
          newUrl = new URL(newUrl, url).toString()
        } catch (e) {
          // If it fails, assume it's absolute or invalid, let the next call handle it
        }

        downloadWithLimit(newUrl, destPath, maxSize, timeout, redirects + 1)
          .then(resolve)
          .catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        clearTimeout(timeoutId)
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
        return
      }

      const contentLength = parseInt(res.headers['content-length'] || '0', 10)
      if (contentLength > maxSize) {
        clearTimeout(timeoutId)
        reject(new Error(`File too large: ${contentLength} bytes (max ${maxSize})`))
        return
      }

      let downloadedSize = 0
      const fileStream = fs.createWriteStream(destPath)

      res.on('data', (chunk) => {
        downloadedSize += chunk.length
        if (downloadedSize > maxSize) {
          fileStream.close()
          clearTimeout(timeoutId)
          reject(new Error(`Download exceeded size limit: ${maxSize} bytes`))
        }
      })

      res.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        clearTimeout(timeoutId)
        resolve()
      })

      fileStream.on('error', (error) => {
        clearTimeout(timeoutId)
        fs.unlinkSync(destPath)
        reject(error)
      })
    }).on('error', (error) => {
      clearTimeout(timeoutId)
      reject(error)
    })

    request.setTimeout(timeout, () => {
      request.destroy()
      reject(new Error(`Download timed out after ${timeout}ms`))
    })
  })
}

/**
 * Discover package.json from HTTP/HTTPS tarball dependency
 * @param {string} name - Dependency name
 * @param {string} tarballUrl - Tarball URL
 * @returns {Promise<Object>} Discovery result
 */
async function discoverTarballDependency (name, tarballUrl) {
  const tempDir = path.join(
    os.tmpdir(),
    `ns-upgrade-tarball-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )

  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true })

    const tarballPath = path.join(tempDir, 'package.tgz')

    // Download with 10MB size limit and 30s timeout
    await downloadWithLimit(tarballUrl, tarballPath, 10 * 1024 * 1024, 30000)

    // Extract tarball with 10s timeout (cross-platform approach)
    // npm packages typically extract to 'package/' directory
    if (isCommandAvailable('tar')) {
      // Use system tar command if available
      await execWithTimeout('tar', ['-xzf', tarballPath, '-C', tempDir], { timeout: 10000, cwd: tempDir })
    } else {
      // Fallback to Node.js tar library (works on all platforms including older Windows)
      await tar.extract({
        file: tarballPath,
        cwd: tempDir
      })
    }

    // Look for package.json in common locations
    const possiblePaths = [
      path.join(tempDir, 'package', 'package.json'),
      path.join(tempDir, 'package.json')
    ]

    // Also check first-level subdirectories (common for GitHub tarballs: user-repo-sha/)
    try {
      const entries = fs.readdirSync(tempDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          possiblePaths.push(path.join(tempDir, entry.name, 'package.json'))
        }
      }
    } catch (err) {
      // Ignore readdir errors
    }

    for (const pkgPath of possiblePaths) {
      if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, 'utf-8')
        const pkg = JSON.parse(content)

        return {
          success: true,
          path: tarballUrl,
          content: pkg,
          isTruncated: false,
          isRoot: false,
          sourceType: 'tarball'
        }
      }
    }

    return {
      success: false,
      warning: `No package.json found in tarball for ${name}`
    }
  } catch (error) {
    // Provide helpful error messages
    let message = error.message
    if (message.includes('timed out')) {
      message = 'Download or extraction timed out'
    } else if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      message = 'Network error - unable to reach server'
    }

    return {
      success: false,
      warning: `Failed to download/extract tarball dependency ${name}: ${message}`
    }
  } finally {
    // Always cleanup temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp dir ${tempDir}:`, cleanupError.message)
    }
  }
}

/**
 * Try to read package.json from node_modules (fastest option)
 * @param {string} name - Package name
 * @param {string} originalVersion - Original version string from dependencies
 * @returns {Promise<Object|null>} Package.json content or null if not found
 */
async function tryReadFromNodeModules (name, originalVersion) {
  try {
    // Try common node_modules locations
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', name, 'package.json'),
      path.join(process.cwd(), '..', 'node_modules', name, 'package.json')
    ]

    for (const pkgPath of possiblePaths) {
      if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, 'utf-8')
        const pkg = JSON.parse(content)

        return {
          success: true,
          path: originalVersion, // Use original version string as path
          content: pkg,
          isTruncated: false,
          isRoot: false,
          sourceType: 'node_modules' // Special source type
        }
      }
    }

    return null // Not found in node_modules
  } catch (error) {
    // If reading fails, return null to fall back to other methods
    return null
  }
}

module.exports = {
  fetchWithTimeout,
  discoverGitHubShorthand,
  downloadWithLimit,
  discoverTarballDependency,
  tryReadFromNodeModules
}
