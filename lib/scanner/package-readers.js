const fs = require('node:fs')
const { FILE_SIZE_LIMITS, PACKAGE_JSON_LIMITS } = require('../constants')
const { truncateIfNeeded } = require('../utils')
const { detectCustomDependency } = require('./dependency-detection')
const { checkGitAvailable, discoverGitDependency } = require('./git-discovery')
const { discoverGitHubShorthand, discoverTarballDependency, tryReadFromNodeModules } = require('./http-discovery')

/**
 * Read multiple package.json files with truncation and error handling
 * @param {Array<string>} filePaths - Paths to package.json files
 * @param {number} maxFiles - Maximum number of files to process
 * @returns {Promise<Object>} Object with results array and warnings array
 */
async function readMultiplePackageJsons (filePaths, maxFiles = PACKAGE_JSON_LIMITS.maxFiles) {
  const results = []
  const warnings = []

  // Limit to prevent memory issues
  const filesToProcess = filePaths.slice(0, maxFiles)
  if (filePaths.length > maxFiles) {
    warnings.push(`Found ${filePaths.length} package.json files, processing first ${maxFiles}`)
  }

  for (const filePath of filesToProcess) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = truncateIfNeeded(content, FILE_SIZE_LIMITS.packageJson)

      results.push({
        path: filePath,
        content: result.isTruncated ? JSON.parse(result.content) : JSON.parse(content),
        isTruncated: result.isTruncated,
        isRoot: false
      })

      if (result.warning) {
        warnings.push(`${filePath}: ${result.warning}`)
      }
    } catch (error) {
      warnings.push(`Failed to read ${filePath}: ${error.message}`)
    }
  }

  return { results, warnings }
}

/**
 * Discover package.json from custom dependencies
 * @param {Object} pkg - Parsed package.json
 * @param {Object} options - Discovery options
 * @returns {Promise<Object>} Discovery results {discovered: [], warnings: []}
 */
async function discoverCustomDependencies (pkg, options = {}) {
  const discovered = []
  const warnings = []

  // Collect all dependencies
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.optionalDependencies
  }

  // Check git availability once
  const hasGit = await checkGitAvailable()
  if (!hasGit && !options.localOnly) {
    warnings.push('git binary not found - skipping git repository discovery')
  }

  // Process each dependency
  for (const [name, version] of Object.entries(allDeps)) {
    const detection = detectCustomDependency(version)

    if (!detection || !detection.requiresDiscovery) {
      continue // Skip npm registry dependencies
    }

    // Skip all remote discovery if localOnly mode
    if (options.localOnly && detection.type !== 'file') {
      continue
    }

    // Skip tarballs if skipTarballs flag is set
    if (options.skipTarballs && detection.type === 'tarball') {
      continue
    }

    try {
      let result = null

      // OPTIMIZATION: Try node_modules first (fastest option)
      // If the dependency is already installed, read it from there
      if (detection.type !== 'file') {
        result = await tryReadFromNodeModules(name, version)
        if (result && result.success) {
          discovered.push(result)
          continue // Found in node_modules, skip expensive discovery
        }
      }

      // Fall back to appropriate discovery method if not in node_modules
      switch (detection.type) {
        case 'file':
          // File dependencies are handled by discoverAllPackageJsonFiles
          // Skip here to avoid duplication
          break

        case 'git':
          if (hasGit) {
            result = await discoverGitDependency(name, detection.url)
          } else {
            warnings.push(`Skipping git dependency ${name} - git not available`)
          }
          break

        case 'github-shorthand':
          result = await discoverGitHubShorthand(name, detection.shorthand)
          break

        case 'tarball':
          result = await discoverTarballDependency(name, detection.url)
          break
      }

      // Add successful discoveries
      if (result && result.success) {
        discovered.push(result)
      } else if (result && result.warning) {
        warnings.push(result.warning)
      }
    } catch (error) {
      warnings.push(`Failed to discover ${name}: ${error.message}`)
    }
  }

  return { discovered, warnings }
}

module.exports = {
  readMultiplePackageJsons,
  discoverCustomDependencies
}
