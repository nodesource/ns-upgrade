// Import module dependencies
const fs = require('node:fs')
const path = require('node:path')
const { detectNodeVersion, detectPackageManager, detectLockfiles, readPackageJson, readLockfile, detectWorkspaces } = require('../detectors')
const { detectCustomDependency, parseGitUrl } = require('./dependency-detection')
const { checkGitAvailable, discoverGitDependency } = require('./git-discovery')
const { discoverGitHubShorthand, discoverTarballDependency, tryReadFromNodeModules } = require('./http-discovery')
const { scanCiConfigs, scanBindingGypFiles, scanCMakeLists, detectCppAddons, discoverAllPackageJsonFiles } = require('./file-scanners')
const { readMultiplePackageJsons, discoverCustomDependencies } = require('./package-readers')

/**
 * Main scan function
 * @param {Array<string>} customExclusions - Custom exclusion patterns
 * @param {Object} options - Scan options
 * @param {boolean} options.skipWorkspaceScan - Skip scanning workspace package.json files
 * @param {number} options.maxFiles - Maximum number of package.json files to scan
 * @param {number} options.scanDepth - Maximum depth for file scanning
 * @param {Object} options.logger - Logger instance
 * @returns {Promise<Object>} Scanned data
 */
async function scan (customExclusions = [], options = {}) {
  const warnings = []
  const logger = options.logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

  try {
    logger.info('Starting environment scan', { customExclusions, options })

    // Detect Node.js version with detailed logging
    logger.debug('Detecting Node.js version')
    let nodeVersionInfo
    try {
      nodeVersionInfo = detectNodeVersion(logger)
      logger.info('Node.js version detected', {
        version: nodeVersionInfo.version,
        versionManager: nodeVersionInfo.versionManager,
        detectionMethods: nodeVersionInfo.detectionLog
      })
    } catch (error) {
      logger.warn('Failed to detect Node.js version', error)
      nodeVersionInfo = { version: 'unknown', versionManager: null }
      warnings.push('Unable to detect Node.js version')
    }

    // Detect package manager
    logger.debug('Detecting package manager')
    let packageManager
    try {
      packageManager = detectPackageManager()
      logger.info('Package manager detected', { packageManager })
    } catch (error) {
      logger.warn('Failed to detect package manager', error)
      packageManager = 'unknown'
      warnings.push('Unable to detect package manager')
    }

    // Detect lockfiles
    logger.debug('Detecting lockfiles')
    let selectedLockfile = null
    let detectedLockfiles = []
    try {
      const lockfileResult = detectLockfiles()
      selectedLockfile = lockfileResult.selected
      detectedLockfiles = lockfileResult.detected
      logger.info('Lockfiles detected', { selected: selectedLockfile?.name, detected: detectedLockfiles.map(l => l.name) })
    } catch (error) {
      logger.warn('Failed to detect lockfiles', error)
      warnings.push('Unable to detect lockfiles')
    }

    // Read package.json
    logger.debug('Reading package.json')
    let packageJsonContent = {}
    let packageJsonTruncated = false
    let packageJsonWarning = null
    try {
      const packageResult = readPackageJson()
      packageJsonContent = packageResult.content
      packageJsonTruncated = packageResult.isTruncated
      packageJsonWarning = packageResult.warning
      if (packageJsonWarning) {
        warnings.push(packageJsonWarning)
        logger.warn('package.json warning', { warning: packageJsonWarning })
      }
      logger.info('package.json read', { isTruncated: packageJsonTruncated })
    } catch (error) {
      logger.error('Failed to read package.json', error)
      throw new Error(`Failed to read package.json: ${error.message}`)
    }

    // Read lockfile
    logger.debug('Reading lockfile')
    let lockfileContent = ''
    let lockfileTruncated = false
    let lockfileWarning = null
    try {
      const lockfileResult = readLockfile(selectedLockfile)
      lockfileContent = lockfileResult.content
      lockfileTruncated = lockfileResult.isTruncated
      lockfileWarning = lockfileResult.warning
      if (lockfileWarning) {
        warnings.push(lockfileWarning)
        logger.warn('Lockfile warning', { warning: lockfileWarning })
      }
      logger.info('Lockfile read', { isTruncated: lockfileTruncated })
    } catch (error) {
      logger.warn('Failed to read lockfile', error)
      warnings.push('Unable to read lockfile')
    }

    // Detect workspaces
    logger.debug('Detecting workspaces')
    let hasWorkspaces = false
    let monorepoTools = []
    const monorepoConfigs = []
    try {
      const workspaceResult = detectWorkspaces(packageJsonContent, detectCustomDependency)
      hasWorkspaces = workspaceResult.hasWorkspaces
      monorepoTools = workspaceResult.tools || []

      // Read config files
      if (workspaceResult.configFiles && workspaceResult.configFiles.length > 0) {
        for (const configFile of workspaceResult.configFiles) {
          try {
            const configPath = path.join(process.cwd(), configFile)
            if (fs.existsSync(configPath)) {
              const content = fs.readFileSync(configPath, 'utf8')
              monorepoConfigs.push({
                name: configFile,
                content
              })
            }
          } catch (err) {
            logger.warn(`Failed to read monorepo config file: ${configFile}`, err)
            warnings.push(`Unable to read monorepo config: ${configFile}`)
          }
        }
      }

      logger.info('Workspaces detection completed', { hasWorkspaces, tools: monorepoTools })
    } catch (error) {
      logger.warn('Failed to detect workspaces', error)
      warnings.push('Unable to detect workspaces')
    }

    // Scan for all package.json files if workspaces detected (unless explicitly skipped)
    let allPackageJsons = []
    if (hasWorkspaces && !options.skipWorkspaceScan) {
      logger.debug('Scanning workspace package.json files')
      try {
        // 1. Discover file-based package.json files (from file: deps and workspace globs)
        const packageJsonFiles = await discoverAllPackageJsonFiles(customExclusions, options.scanDepth)
        logger.info('package.json files discovered', { count: packageJsonFiles.length })

        if (packageJsonFiles.length > 0) {
          const { results, warnings: packageWarnings } = await readMultiplePackageJsons(packageJsonFiles, options.maxFiles)
          allPackageJsons = results
          warnings.push(...packageWarnings)
          logger.info('Multiple package.json files read', { count: results.length, warningsCount: packageWarnings.length })
          packageWarnings.forEach(w => logger.warn('Package reading warning', { warning: w }))
        }

        // 2. Discover remote custom dependencies (git, GitHub, tarballs)
        // Skip if localOnly flag is set
        if (!options.localOnly) {
          logger.debug('Discovering remote custom dependencies')
          const { discovered, warnings: customWarnings } = await discoverCustomDependencies(
            packageJsonContent,
            options
          )
          allPackageJsons.push(...discovered)
          warnings.push(...customWarnings)
          logger.info('Custom dependencies discovered', { count: discovered.length, warningsCount: customWarnings.length })
          customWarnings.forEach(w => logger.warn('Custom dependency warning', { warning: w }))
        } else {
          logger.info('Skipping remote dependency discovery (localOnly mode)')
        }
      } catch (error) {
        logger.warn('Failed to scan workspace packages', error)
        warnings.push('Unable to scan workspace packages')
      }
    } else if (options.skipWorkspaceScan) {
      logger.info('Skipping workspace scan (skipWorkspaceScan flag set)')
    }

    // Scan for CI/CD configs
    logger.debug('Scanning for CI/CD configs')
    let ciConfigsFound = []
    try {
      ciConfigsFound = await scanCiConfigs(customExclusions)
      logger.info('CI/CD configs scan completed', { count: ciConfigsFound.length })
    } catch (error) {
      logger.warn('Failed to scan CI/CD configs', error)
      warnings.push('Unable to scan CI/CD configurations')
    }

    // Scan for binding.gyp files
    logger.debug('Scanning for binding.gyp files')
    let gypFilesFound = []
    try {
      gypFilesFound = await scanBindingGypFiles(customExclusions)
      logger.info('binding.gyp files scan completed', { count: gypFilesFound.length })
    } catch (error) {
      logger.warn('Failed to scan binding.gyp files', error)
      warnings.push('Unable to scan for binding.gyp files')
    }

    // Scan for CMakeLists.txt files
    logger.debug('Scanning for CMakeLists.txt files')
    let cmakeListsFound = []
    try {
      cmakeListsFound = await scanCMakeLists(customExclusions)
      logger.info('CMakeLists.txt files scan completed', { count: cmakeListsFound.length })
    } catch (error) {
      logger.warn('Failed to scan CMakeLists.txt files', error)
      warnings.push('Unable to scan for CMakeLists.txt files')
    }

    // Detect C++ addon dependencies
    logger.debug('Detecting C++ addon dependencies')
    let cppAddonDependencies = []
    try {
      cppAddonDependencies = detectCppAddons(packageJsonContent)
      logger.info('C++ addon dependencies detected', { count: cppAddonDependencies.length })
    } catch (error) {
      logger.warn('Failed to detect C++ addon dependencies', error)
      warnings.push('Unable to detect C++ addon dependencies')
    }

    // Log selected lockfile if multiple found
    if (detectedLockfiles.length > 1) {
      const warning = `Multiple lockfiles found. Using ${selectedLockfile?.name || 'none'}.`
      warnings.push(warning)
      logger.warn('Multiple lockfiles found', { selected: selectedLockfile?.name, detected: detectedLockfiles.map(l => l.name) })
    }

    // Handle missing lockfiles
    if (!selectedLockfile) {
      const warning = 'No lockfile found. Proceeding without lockfile data.'
      warnings.push(warning)
      logger.warn(warning)
    }

    const result = {
      projectInfo: {
        nodeVersionInfo, // Store full detection info (version, versionManager)
        packageManager,
        hasWorkspaces,
        monorepoTools
      },
      scannedData: {
        packageJson: {
          content: packageJsonContent,
          isTruncated: packageJsonTruncated
        },
        allPackageJsons,
        lockfile: {
          name: selectedLockfile?.name || 'none',
          content: lockfileContent,
          isTruncated: lockfileTruncated
        },
        lockfilesDetected: detectedLockfiles,
        ciConfigsFound,
        cppAddons: {
          gypFilesFound,
          cmakeListsFound,
          dependenciesFound: cppAddonDependencies
        },
        monorepoConfigs
      },
      warnings
    }

    logger.info('Scan completed successfully', { warningsCount: warnings.length })
    return result
  } catch (error) {
    logger.error('Scan failed', error)
    throw error
  }
}

module.exports = {
  // Main scan function
  scan,

  // Re-export functions from sub-modules for backward compatibility
  detectNodeVersion,
  detectPackageManager,
  detectLockfiles,
  detectWorkspaces,
  scanCiConfigs,
  scanBindingGypFiles,
  scanCMakeLists,
  detectCppAddons,
  discoverAllPackageJsonFiles,
  readMultiplePackageJsons,
  detectCustomDependency,
  parseGitUrl,
  checkGitAvailable,
  tryReadFromNodeModules,
  discoverGitDependency,
  discoverGitHubShorthand,
  discoverTarballDependency,
  discoverCustomDependencies
}
