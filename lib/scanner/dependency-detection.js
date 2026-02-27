/**
 * Detect if a dependency uses a custom/non-npm-registry source
 * @param {string} version - Dependency version/source string
 * @returns {Object|null} Detection result with type and details
 */
function detectCustomDependency (version) {
  if (typeof version !== 'string') return null

  // 1. File: protocol (local paths)
  if (version.startsWith('file:')) {
    return {
      type: 'file',
      protocol: 'file',
      isCustomSource: true,
      requiresDiscovery: true,
      path: version.replace('file:', '')
    }
  }

  // 2. HTTP/HTTPS tarballs
  if (version.startsWith('http://') || version.startsWith('https://')) {
    return {
      type: 'tarball',
      protocol: version.startsWith('https://') ? 'https' : 'http',
      isCustomSource: true,
      requiresDiscovery: true,
      url: version
    }
  }

  // 3. Git protocols
  const gitProtocols = ['git://', 'git+ssh://', 'git+http://', 'git+https://', 'git+file://']
  for (const protocol of gitProtocols) {
    if (version.startsWith(protocol)) {
      return {
        type: 'git',
        protocol: protocol.replace('git+', '').replace('://', ''),
        isCustomSource: true,
        requiresDiscovery: true,
        url: version
      }
    }
  }

  // 4. GitHub shorthand (user/repo or user/repo#ref)
  const githubPattern = /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(#.*)?$/
  if (githubPattern.test(version)) {
    return {
      type: 'github-shorthand',
      protocol: 'github',
      isCustomSource: true,
      requiresDiscovery: true,
      shorthand: version
    }
  }

  // 5. npm: alias (points to npm registry, so not custom)
  if (version.startsWith('npm:')) {
    return {
      type: 'npm-alias',
      protocol: 'npm',
      isCustomSource: false,
      requiresDiscovery: false,
      alias: version
    }
  }

  return null // Standard npm registry version
}

/**
 * Parse a git URL to extract repository and ref/tag
 * @param {string} gitUrl - Git URL (e.g., git+ssh://git@github.com:user/repo.git#v1.0.0)
 * @returns {Object} Parsed components { repo, ref, protocol }
 */
function parseGitUrl (gitUrl) {
  // Extract ref/tag if present (#ref or #semver:version)
  const [urlPart, refPart] = gitUrl.split('#')
  const ref = refPart || null

  // Remove git+ prefix if present
  const cleanUrl = urlPart.replace(/^git\+/, '')

  // Extract protocol
  const protocolMatch = cleanUrl.match(/^([a-z]+):\/\//)
  const protocol = protocolMatch ? protocolMatch[1] : 'git'

  return {
    repo: urlPart,
    ref,
    protocol,
    cleanUrl
  }
}

module.exports = {
  detectCustomDependency,
  parseGitUrl
}
