const fs = require('node:fs')
const { glob } = require('glob')
const { DEFAULT_EXCLUSIONS, KNOWN_CPP_ADDONS, CI_CONFIG_PATTERNS, PACKAGE_JSON_LIMITS } = require('../constants')

/**
 * Build glob patterns with exclusions
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @param {number} maxDepth - Maximum depth for scanning
 * @returns {Object} Glob options
 */
function buildGlobOptions (customExclusions = [], maxDepth = PACKAGE_JSON_LIMITS.scanDepth) {
  const exclusions = [...DEFAULT_EXCLUSIONS, ...customExclusions]
  const ignore = exclusions.map(pattern => `**/${pattern}/**`)

  return {
    ignore,
    maxDepth
  }
}

/**
 * Scan for CI/CD config files
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @returns {Promise<Array<string>>} Found CI config files
 */
async function scanCiConfigs (customExclusions = []) {
  const options = buildGlobOptions(customExclusions)
  const found = []

  for (const pattern of CI_CONFIG_PATTERNS) {
    try {
      const matches = await glob(pattern, options)
      found.push(...matches)
    } catch (error) {
      // Silently skip patterns that don't match
    }
  }

  return [...new Set(found)] // Remove duplicates
}

/**
 * Parse binding.gyp content
 * @param {string} content - File content
 * @returns {Object|null} Parsed content or null
 */
function parseBindingGyp (content) {
  try {
    // Try strict JSON first
    return JSON.parse(content)
  } catch (e) {
    // Basic cleanup to try and make it JSON-compatible
    // 1. Remove comments (#...)
    // 2. Replace single quotes with double quotes
    // 3. Remove trailing commas
    const jsonStr = content
      .replace(/#.*/g, '')
      .replace(/'/g, '"')
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/\s+/g, ' ') // Collapse whitespace

    try {
      return JSON.parse(jsonStr)
    } catch (e2) {
      return null
    }
  }
}

/**
 * Extract sources from binding.gyp content using regex
 * @param {string} content - File content
 * @returns {Array<string>} Found source files
 */
function extractSourcesFromGyp (content) {
  const sources = []
  // Look for "sources": [ ... ] pattern
  // This is a rough approximation
  const sourcesMatch = content.match(/"?sources"?\s*:\s*\[([^\]]+)\]/s) || content.match(/'sources'\s*:\s*\[([^\]]+)\]/s)

  if (sourcesMatch && sourcesMatch[1]) {
    const fileMatches = sourcesMatch[1].match(/['"]([^'"]+)['"]/g)
    if (fileMatches) {
      fileMatches.forEach(f => sources.push(f.replace(/['"]/g, '')))
    }
  }
  return sources
}

/**
 * Scan for binding.gyp files and read their content
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @returns {Promise<Array<Object>>} Found binding.gyp files with content
 */
async function scanBindingGypFiles (customExclusions = []) {
  const options = buildGlobOptions(customExclusions)

  try {
    const matches = await glob('**/binding.gyp', options)

    return matches.map(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const parsed = parseBindingGyp(content)
        const sources = parsed ? [] : extractSourcesFromGyp(content) // If parsed, we assume we can traverse it later, or we can extract here.

        // If parsed successfully, try to extract sources from the object structure
        if (parsed && parsed.targets) {
          parsed.targets.forEach(target => {
            if (target.sources && Array.isArray(target.sources)) {
              sources.push(...target.sources)
            }
          })
        }

        return {
          path: filePath,
          content,
          parsed,
          sources: [...new Set(sources)]
        }
      } catch (err) {
        return {
          path: filePath,
          error: err.message
        }
      }
    })
  } catch (error) {
    return []
  }
}

/**
 * Scan for CMakeLists.txt files
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @returns {Promise<Array<string>>} Found CMakeLists.txt files
 */
async function scanCMakeLists (customExclusions = []) {
  const options = buildGlobOptions(customExclusions)
  try {
    return await glob('**/CMakeLists.txt', options)
  } catch (error) {
    return []
  }
}

/**
 * Detect known C++ addon dependencies
 * @param {Object} pkg - Parsed package.json
 * @returns {Array<string>} Found C++ addon dependencies
 */
function detectCppAddons (pkg) {
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.optionalDependencies
  }

  return KNOWN_CPP_ADDONS.filter(addon => addon in allDeps)
}

/**
 * Discover all package.json files in the project
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @param {number} maxDepth - Maximum depth for scanning
 * @returns {Promise<Array<string>>} Found package.json files (excluding root)
 */
async function discoverAllPackageJsonFiles (customExclusions = [], maxDepth = PACKAGE_JSON_LIMITS.scanDepth) {
  const options = buildGlobOptions(customExclusions, maxDepth)

  try {
    const files = await glob('**/package.json', options)
    // Filter out root package.json (will be handled separately)
    return files.filter(f => f !== 'package.json')
  } catch (error) {
    return []
  }
}

module.exports = {
  buildGlobOptions,
  scanCiConfigs,
  scanBindingGypFiles,
  scanCMakeLists,
  detectCppAddons,
  discoverAllPackageJsonFiles
}
