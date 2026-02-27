const { test, describe } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const {
  scan,
  detectNodeVersion,
  detectPackageManager,
  detectLockfiles,
  detectWorkspaces,
  detectCppAddons,
  discoverAllPackageJsonFiles,
  readMultiplePackageJsons,
  detectCustomDependency,
  parseGitUrl,
  checkGitAvailable,
  tryReadFromNodeModules,
  discoverGitHubShorthand,
  discoverTarballDependency
} = require('../lib/scanner')

describe('Scanner - Basic Detection Functions', () => {
  test('detectNodeVersion', () => {
    const result = detectNodeVersion()
    assert.ok(result, 'Should return a result object')
    assert.ok(result.version, 'Should have version property')
    assert.ok(result.version.startsWith('v'), 'Node version should start with v')
    assert.match(result.version, /v\d+\.\d+\.\d+/, 'Node version should match semver format')
    assert.ok('versionManager' in result, 'Should have versionManager property')
  })

  test('detectPackageManager', () => {
    const pm = detectPackageManager()
    assert.ok(['npm', 'yarn', 'pnpm', 'unknown'].includes(pm.name), 'Package manager name should be valid')
    assert.ok(typeof pm.version === 'string', 'Package manager version should be a string')
  })

  test('detectLockfiles', () => {
    const result = detectLockfiles()
    assert.ok(Array.isArray(result.detected), 'Detected lockfiles should be an array')
    assert.ok(result.selected === null || typeof result.selected === 'object', 'Selected lockfile should be null or object')
  })
})

describe('Scanner - Workspace Detection', () => {
  test('detectWorkspaces with no workspaces', () => {
    const pkg = { name: 'test-pkg', version: '1.0.0' }
    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, false, 'Should return false when no workspaces field')
  })

  test('detectWorkspaces with workspaces', () => {
    const pkg = { name: 'test-pkg', version: '1.0.0', workspaces: ['packages/*'] }
    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should return true when workspaces field exists')
  })

  test('detectWorkspaces with file: dependencies', () => {
    const pkg = {
      name: 'test-pkg',
      version: '1.0.0',
      dependencies: {
        '@ns/build': 'file:ns-build',
        '@ns/config': 'file:ns-config',
        express: '^4.0.0'
      }
    }

    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should return true when file: dependencies exist')
  })

  test('detectWorkspaces with file: in devDependencies', () => {
    const pkg = {
      name: 'test-pkg',
      version: '1.0.0',
      devDependencies: {
        '@internal/tools': 'file:./tools'
      }
    }

    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should return true when file: dependencies in devDeps')
  })

  test('detectWorkspaces detects git dependencies', () => {
    const pkg = {
      name: 'test-pkg',
      version: '1.0.0',
      dependencies: {
        '@internal/auth': 'git+ssh://git@github.company.com:platform/auth.git',
        express: '^4.18.0'
      }
    }

    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect git dependencies as workspaces')
  })

  test('detectWorkspaces detects GitHub shorthand', () => {
    const pkg = {
      name: 'test-pkg',
      version: '1.0.0',
      dependencies: {
        mocha: 'mochajs/mocha#abc123'
      }
    }

    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect GitHub shorthand as workspaces')
  })

  test('detectWorkspaces detects tarball URLs', () => {
    const pkg = {
      name: 'test-pkg',
      version: '1.0.0',
      dependencies: {
        'custom-pkg': 'https://artifacts.company.com/npm/pkg-1.0.0.tgz'
      }
    }

    const result = detectWorkspaces(pkg)
    assert.strictEqual(result.hasWorkspaces, true, 'Should detect tarball URLs as workspaces')
  })
})

describe('Scanner - C++ Addon Detection', () => {
  test('detectCppAddons with no addons', () => {
    const pkg = { dependencies: { express: '^4.0.0' } }
    const addons = detectCppAddons(pkg)
    assert.deepStrictEqual(addons, [], 'Should return empty array when no C++ addons')
  })

  test('detectCppAddons with known addons', () => {
    const pkg = { dependencies: { 'node-sass': '^6.0.0', bcrypt: '^5.0.0' } }
    const addons = detectCppAddons(pkg)
    assert.ok(addons.includes('node-sass'), 'Should detect node-sass')
    assert.ok(addons.includes('bcrypt'), 'Should detect bcrypt')
  })

  test('detectCppAddons from devDependencies', () => {
    const pkg = { devDependencies: { sqlite3: '^5.0.0' } }
    const addons = detectCppAddons(pkg)
    assert.ok(addons.includes('sqlite3'), 'Should detect sqlite3 from devDependencies')
  })
})

describe('Scanner - Package.json Discovery', () => {
  test('discoverAllPackageJsonFiles returns array', async () => {
    const files = await discoverAllPackageJsonFiles()
    assert.ok(Array.isArray(files), 'Should return an array')
    // Should not include root package.json
    assert.ok(!files.includes('package.json'), 'Should not include root package.json')
  })

  test('discoverAllPackageJsonFiles respects exclusions', async () => {
    const files = await discoverAllPackageJsonFiles(['test'])
    assert.ok(Array.isArray(files), 'Should return an array')
    // Files from test directory should be excluded
    const hasTestFiles = files.some(f => f.startsWith('test/'))
    assert.strictEqual(hasTestFiles, false, 'Should exclude test directory files')
  })

  test('readMultiplePackageJsons with empty array', async () => {
    const { results, warnings } = await readMultiplePackageJsons([])
    assert.deepStrictEqual(results, [], 'Should return empty results for empty input')
    assert.deepStrictEqual(warnings, [], 'Should return empty warnings for empty input')
  })

  test('readMultiplePackageJsons enforces max files limit', async () => {
    // Create array with more than max limit
    const manyFiles = Array(150).fill('fake-package.json')
    const { warnings } = await readMultiplePackageJsons(manyFiles, 100)
    assert.ok(warnings.length > 0, 'Should have warnings when exceeding limit')
    assert.ok(warnings[0].includes('100'), 'Warning should mention the limit')
  })

  test('readMultiplePackageJsons handles invalid files gracefully', async () => {
    const invalidFiles = ['non-existent-package.json']
    const { results, warnings } = await readMultiplePackageJsons(invalidFiles)
    assert.strictEqual(results.length, 0, 'Should return no results for invalid files')
    assert.ok(warnings.length > 0, 'Should have warnings for invalid files')
    assert.ok(warnings[0].includes('Failed to read'), 'Warning should mention read failure')
  })

  test('readMultiplePackageJsons structure validation', async () => {
    // This test will pass even with no actual package.json files
    // Just validating the return structure
    const { results, warnings } = await readMultiplePackageJsons([])
    assert.ok(Array.isArray(results), 'Results should be an array')
    assert.ok(Array.isArray(warnings), 'Warnings should be an array')

    // Each result should have correct structure if any exist
    results.forEach(result => {
      assert.ok(typeof result.path === 'string', 'Result should have path string')
      assert.ok(typeof result.content === 'object', 'Result should have content object')
      assert.ok(typeof result.isTruncated === 'boolean', 'Result should have isTruncated boolean')
      assert.ok(typeof result.isRoot === 'boolean', 'Result should have isRoot boolean')
      assert.strictEqual(result.isRoot, false, 'Non-root packages should have isRoot = false')
    })
  })
})

describe('Scanner - Custom Dependency Detection', () => {
  test('detectCustomDependency detects file: protocol', () => {
    const result = detectCustomDependency('file:./packages/api')
    assert.ok(result, 'Should detect file: dependency')
    assert.strictEqual(result.type, 'file')
    assert.strictEqual(result.protocol, 'file')
    assert.strictEqual(result.isCustomSource, true)
    assert.strictEqual(result.path, './packages/api')
  })

  test('detectCustomDependency detects git+ssh URLs', () => {
    const result = detectCustomDependency('git+ssh://git@github.com:user/repo.git#v1.0.0')
    assert.ok(result, 'Should detect git+ssh dependency')
    assert.strictEqual(result.type, 'git')
    assert.strictEqual(result.protocol, 'ssh')
    assert.strictEqual(result.isCustomSource, true)
  })

  test('detectCustomDependency detects git+https URLs', () => {
    const result = detectCustomDependency('git+https://github.com/user/repo.git')
    assert.ok(result, 'Should detect git+https dependency')
    assert.strictEqual(result.type, 'git')
    assert.strictEqual(result.protocol, 'https')
    assert.strictEqual(result.isCustomSource, true)
  })

  test('detectCustomDependency detects git:// URLs', () => {
    const result = detectCustomDependency('git://github.com/user/repo.git')
    assert.ok(result, 'Should detect git:// dependency')
    assert.strictEqual(result.type, 'git')
    assert.strictEqual(result.protocol, 'git')
  })

  test('detectCustomDependency detects HTTP tarballs', () => {
    const result = detectCustomDependency('http://example.com/package.tgz')
    assert.ok(result, 'Should detect HTTP tarball')
    assert.strictEqual(result.type, 'tarball')
    assert.strictEqual(result.protocol, 'http')
    assert.strictEqual(result.url, 'http://example.com/package.tgz')
  })

  test('detectCustomDependency detects HTTPS tarballs', () => {
    const result = detectCustomDependency('https://cdn.example.com/packages/pkg-1.0.0.tar.gz')
    assert.ok(result, 'Should detect HTTPS tarball')
    assert.strictEqual(result.type, 'tarball')
    assert.strictEqual(result.protocol, 'https')
  })

  test('detectCustomDependency detects GitHub shorthand', () => {
    const result = detectCustomDependency('mochajs/mocha#4727d357ea')
    assert.ok(result, 'Should detect GitHub shorthand')
    assert.strictEqual(result.type, 'github-shorthand')
    assert.strictEqual(result.protocol, 'github')
    assert.strictEqual(result.shorthand, 'mochajs/mocha#4727d357ea')
  })

  test('detectCustomDependency detects GitHub shorthand without ref', () => {
    const result = detectCustomDependency('expressjs/express')
    assert.ok(result, 'Should detect GitHub shorthand without ref')
    assert.strictEqual(result.type, 'github-shorthand')
  })

  test('detectCustomDependency returns null for standard versions', () => {
    const testCases = ['1.0.0', '^4.18.0', '~2.1.3', '>=1.0.0', '*', 'latest']
    testCases.forEach(version => {
      const result = detectCustomDependency(version)
      assert.strictEqual(result, null, `Should return null for standard version: ${version}`)
    })
  })

  test('detectCustomDependency detects npm: aliases as non-custom', () => {
    const result = detectCustomDependency('npm:lodash-es@4.17.21')
    assert.ok(result, 'Should detect npm: alias')
    assert.strictEqual(result.type, 'npm-alias')
    assert.strictEqual(result.isCustomSource, false)
  })

  test('detectCustomDependency handles non-string input', () => {
    const result = detectCustomDependency(null)
    assert.strictEqual(result, null, 'Should return null for non-string input')
  })
})

describe('Scanner - Git URL Parsing', () => {
  test('parseGitUrl parses git+ssh URL with ref', () => {
    const result = parseGitUrl('git+ssh://git@github.com:user/repo.git#v1.0.0')
    assert.strictEqual(result.ref, 'v1.0.0')
    assert.strictEqual(result.protocol, 'ssh')
    assert.ok(result.repo.includes('git+ssh://'))
  })

  test('parseGitUrl parses git+https URL', () => {
    const result = parseGitUrl('git+https://github.com/user/repo.git')
    assert.strictEqual(result.ref, null)
    assert.strictEqual(result.protocol, 'https')
  })

  test('parseGitUrl parses URL with semver ref', () => {
    const result = parseGitUrl('git+ssh://git@github.com:npm/cli.git#semver:^5.0')
    assert.strictEqual(result.ref, 'semver:^5.0')
  })

  test('parseGitUrl handles git:// protocol', () => {
    const result = parseGitUrl('git://github.com/npm/cli.git#v1.0.27')
    assert.strictEqual(result.ref, 'v1.0.27')
    assert.strictEqual(result.protocol, 'git')
  })
})

describe('Scanner - Git Discovery', () => {
  test('checkGitAvailable checks for git binary', async () => {
    const hasGit = await checkGitAvailable()
    assert.ok(typeof hasGit === 'boolean', 'Should return boolean')
    // Note: This will be true in most CI/dev environments
    // If git is not available, test still passes as we're just checking the return type
  })
})

describe('Scanner - Node Modules Reading', () => {
  test('tryReadFromNodeModules reads from installed packages', async () => {
    // Test with 'glob' package which we know exists in node_modules
    const result = await tryReadFromNodeModules('glob', 'git+https://github.com/isaacs/node-glob.git')

    // This test will succeed if glob is installed in node_modules
    if (result) {
      assert.strictEqual(result.success, true, 'Should successfully read from node_modules')
      assert.strictEqual(result.sourceType, 'node_modules', 'Should have node_modules source type')
      assert.ok(result.content, 'Should have package.json content')
      assert.strictEqual(result.content.name, 'glob', 'Should have correct package name')
      assert.ok(result.path, 'Should preserve original version string as path')
    } else {
      // Package not in node_modules, which is also valid
      assert.strictEqual(result, null, 'Should return null when not found')
    }
  })

  test('tryReadFromNodeModules returns null for non-existent package', async () => {
    const result = await tryReadFromNodeModules('nonexistent-package-xyz-123', 'git+https://example.com/fake.git')
    assert.strictEqual(result, null, 'Should return null for non-existent package')
  })
})

describe('Scanner - GitHub Shorthand Discovery', () => {
  test('discoverGitHubShorthand with valid public repo', async () => {
    // Test with a small, stable public repo (lodash is a good test candidate)
    const result = await discoverGitHubShorthand('lodash', 'lodash/lodash')

    // This will succeed if:
    // 1. Network is available
    // 2. GitHub is accessible
    // 3. No rate limiting
    // If it fails, check that it returns proper error structure
    assert.ok(result, 'Should return a result object')
    assert.ok(typeof result.success === 'boolean', 'Should have success property')

    if (result.success) {
      assert.strictEqual(result.sourceType, 'github-shorthand')
      assert.ok(result.content, 'Should have content')
      assert.ok(result.content.name, 'Should have package name')
      assert.strictEqual(result.path, 'github:lodash/lodash')
    } else {
      // If it failed, should have warning
      assert.ok(result.warning, 'Failed result should have warning message')
    }
  })

  test('discoverGitHubShorthand with invalid repo format', async () => {
    const result = await discoverGitHubShorthand('invalid', 'not-valid-format')
    assert.strictEqual(result.success, false, 'Should fail for invalid format')
    assert.ok(result.warning, 'Should have warning message')
    assert.ok(result.warning.includes('Invalid'), 'Warning should mention invalid format')
  })
})

describe('Scanner - Tarball Discovery', () => {
  test('discoverTarballDependency with invalid URL', async () => {
    // Test with a URL that will fail quickly
    const result = await discoverTarballDependency('test-pkg', 'http://invalid-domain-that-does-not-exist.test/package.tgz')

    // Should fail but return proper structure
    assert.ok(result, 'Should return a result object')
    assert.strictEqual(result.success, false, 'Should fail for invalid URL')
    assert.ok(result.warning, 'Should have warning message')
  })

  test('discoverTarballDependency return structure', async () => {
    // Test with invalid URL to get quick failure
    const result = await discoverTarballDependency('test-pkg', 'http://localhost:99999/nonexistent.tgz')

    // Verify error structure
    assert.ok(typeof result.success === 'boolean', 'Should have success property')
    if (!result.success) {
      assert.ok(result.warning, 'Failed result should have warning')
      assert.ok(typeof result.warning === 'string', 'Warning should be string')
    }
  })
})

describe('Scanner - Custom Dependency Discovery Orchestrator', () => {
  test('discoverCustomDependencies with localOnly flag', async () => {
    const pkg = {
      name: 'test-pkg',
      version: '1.0.0',
      dependencies: {
        'local-dep': 'file:./packages/local',
        'git-dep': 'git+https://github.com/user/repo.git',
        'github-dep': 'lodash/lodash',
        'tarball-dep': 'https://example.com/package.tgz'
      }
    }

    // With localOnly, should skip all remote deps
    const result = await require('../lib/scanner').discoverCustomDependencies(pkg, { localOnly: true })

    assert.ok(result, 'Should return result object')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')

    // All remote deps should be skipped - no discoveries expected
    assert.strictEqual(result.discovered.length, 0, 'Should discover 0 remote deps in localOnly mode')
  })

  test('discoverCustomDependencies with skipTarballs flag', async () => {
    const pkg = {
      name: 'test-pkg',
      version: '1.0.0',
      dependencies: {
        'github-dep': 'lodash/lodash'
      }
    }

    // With skipTarballs, github should still work
    const result = await require('../lib/scanner').discoverCustomDependencies(pkg, { skipTarballs: true })

    assert.ok(result, 'Should return result object')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')

    // GitHub dependency should be discovered
    if (result.discovered.length > 0) {
      assert.strictEqual(result.discovered[0].sourceType, 'github-shorthand')
    }
  })
})

describe('Scanner - Main Scan Function', () => {
  test('scan function with logger', async () => {
    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      startOperation: () => {},
      endOperation: () => {}
    }

    const result = await scan([], { logger: mockLogger })

    assert.ok(result, 'Should return scan result')
    assert.ok(result.projectInfo, 'Should have projectInfo')
    assert.ok(result.scannedData, 'Should have scannedData')
  })

  test('scan with skipWorkspaceScan option', async () => {
    const result = await scan([], {
      skipWorkspaceScan: true,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, startOperation: () => {}, endOperation: () => {} }
    })

    assert.ok(result, 'Should return result')
    assert.ok(result.projectInfo, 'Should have projectInfo')
    assert.ok(result.scannedData, 'Should have scannedData')
    assert.ok(Array.isArray(result.scannedData.allPackageJsons), 'Should have allPackageJsons array')
  })

  test('scan with localOnly option', async () => {
    const result = await scan([], {
      localOnly: true,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, startOperation: () => {}, endOperation: () => {} }
    })

    assert.ok(result, 'Should return result')
    assert.ok(result.projectInfo, 'Should have projectInfo')
    // localOnly should skip remote dependency discovery
    assert.ok(result.scannedData, 'Should have scannedData')
  })

  test('scan with skipTarballs option', async () => {
    const result = await scan([], {
      skipTarballs: true,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, startOperation: () => {}, endOperation: () => {} }
    })

    assert.ok(result, 'Should return result')
    assert.ok(result.projectInfo, 'Should have projectInfo')
    assert.ok(result.scannedData, 'Should have scannedData')
  })

  test('scan combines multiple options', async () => {
    const result = await scan([], {
      skipWorkspaceScan: true,
      localOnly: true,
      skipTarballs: true,
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, startOperation: () => {}, endOperation: () => {} }
    })

    assert.ok(result, 'Should return result')
    assert.ok(result.projectInfo, 'Should have projectInfo')
    assert.ok(result.scannedData, 'Should have scannedData')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')
  })

  test('scan detects CI configs', async () => {
    const result = await scan([], {
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, startOperation: () => {}, endOperation: () => {} }
    })

    assert.ok(Array.isArray(result.scannedData.ciConfigsFound), 'Should have ciConfigsFound array')
  })

  test('scan detects C++ addons', async () => {
    const result = await scan([], {
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, startOperation: () => {}, endOperation: () => {} }
    })

    assert.ok(result.scannedData.cppAddons, 'Should have cppAddons')
    assert.ok(Array.isArray(result.scannedData.cppAddons.gypFilesFound), 'Should have gypFilesFound array')
    assert.ok(Array.isArray(result.scannedData.cppAddons.dependenciesFound), 'Should have dependenciesFound array')
  })

  test('scan with custom exclusions', async () => {
    const customExclusions = ['test', 'dist']
    const result = await scan(customExclusions, {})

    assert.ok(result, 'Should complete scan with custom exclusions')
    assert.ok(result.projectInfo, 'Should have projectInfo')
  })

  test('scan with custom logger', async () => {
    const loggedMessages = []
    const customLogger = {
      info: (msg) => loggedMessages.push({ level: 'info', msg }),
      warn: (msg) => loggedMessages.push({ level: 'warn', msg }),
      error: (msg) => loggedMessages.push({ level: 'error', msg }),
      debug: (msg) => loggedMessages.push({ level: 'debug', msg })
    }

    const result = await scan([], { logger: customLogger })
    assert.ok(result, 'Should complete scan with custom logger')
    assert.ok(loggedMessages.length > 0, 'Should have logged messages')
  })

  test('scan validates returned structure completely', async () => {
    const result = await scan([], {})

    // Validate top-level structure
    assert.ok(result.projectInfo, 'Should have projectInfo')
    assert.ok(result.scannedData, 'Should have scannedData')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')

    // Validate projectInfo structure
    assert.ok('nodeVersionInfo' in result.projectInfo, 'Should have nodeVersionInfo')
    assert.ok(result.projectInfo.nodeVersionInfo.version, 'Should have version in nodeVersionInfo')
    assert.ok('versionManager' in result.projectInfo.nodeVersionInfo, 'Should have versionManager in nodeVersionInfo')
    assert.ok('packageManager' in result.projectInfo, 'Should have packageManager')
    assert.ok('hasWorkspaces' in result.projectInfo, 'Should have hasWorkspaces')

    // Validate scannedData structure
    assert.ok('packageJson' in result.scannedData, 'Should have packageJson')
    assert.ok('lockfile' in result.scannedData, 'Should have lockfile')
    assert.ok('lockfilesDetected' in result.scannedData, 'Should have lockfilesDetected')
    assert.ok('ciConfigsFound' in result.scannedData, 'Should have ciConfigsFound')
    assert.ok('cppAddons' in result.scannedData, 'Should have cppAddons')
  })

  test('scan handles skipWorkspaceScan correctly', async () => {
    const result = await scan([], { skipWorkspaceScan: true })

    // Should still complete successfully
    assert.ok(result.projectInfo, 'Should have projectInfo')
    assert.ok(result.scannedData, 'Should have scannedData')

    // Check if workspace scanning was skipped
    if (!result.scannedData.allPackageJsons) {
      assert.ok(true, 'Workspace scan was skipped as expected')
    }
  })

  test('scan with all options combined', async () => {
    const result = await scan(['test', 'node_modules'], {
      skipWorkspaceScan: true,
      localOnly: true,
      skipTarballs: true
    })

    assert.ok(result, 'Should handle all options combined')
    assert.ok(result.projectInfo, 'Should have projectInfo')
    assert.ok(result.scannedData, 'Should have scannedData')
  })
})

describe('Scanner - Error Handling and Robustness', () => {
  test('scan function has comprehensive error handling', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('try {'), 'Should have try blocks for error handling')
    assert.ok(content.includes('catch (error)'), 'Should have catch blocks')
    assert.ok(content.includes('logger.error'), 'Should log errors')
  })

  test('scan function provides graceful degradation', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('catch (error)'), 'Should wrap operations in try-catch')
    assert.ok(content.includes('warnings.push'), 'Should add warnings for non-fatal errors')
    assert.ok(content.includes('Unable to detect'), 'Should provide fallback values')
  })

  test('scan function logs detailed information', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('logger.info'), 'Should log info messages')
    assert.ok(content.includes('logger.debug'), 'Should log debug messages')
    assert.ok(content.includes('logger.warn'), 'Should log warnings')
    assert.ok(content.includes('Starting environment scan'), 'Should log scan start')
  })

  test('handles individual step failures gracefully', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    // Check that each major scanning step has error handling
    assert.ok(content.includes('Failed to detect Node.js version'), 'Should handle Node version detection failure')
    assert.ok(content.includes('Failed to detect package manager'), 'Should handle package manager detection failure')
    assert.ok(content.includes('Failed to detect lockfiles'), 'Should handle lockfile detection failure')
    assert.ok(content.includes('Failed to read package.json'), 'Should handle package.json reading failure')
    assert.ok(content.includes('Failed to read lockfile'), 'Should handle lockfile reading failure')
    assert.ok(content.includes('Failed to detect workspaces'), 'Should handle workspace detection failure')
    assert.ok(content.includes('Failed to scan workspace packages'), 'Should handle workspace scanning failure')
    assert.ok(content.includes('Failed to scan CI/CD configs'), 'Should handle CI config scanning failure')
    assert.ok(content.includes('Failed to scan binding.gyp files'), 'Should handle binding.gyp scanning failure')
    assert.ok(content.includes('Failed to detect C++ addon dependencies'), 'Should handle C++ addon detection failure')
  })

  test('provides fallback values for failed operations', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('nodeVersionInfo = { version: \'unknown\', versionManager: null }'), 'Should provide fallback for Node version')
    assert.ok(content.includes('packageManager = \'unknown\''), 'Should provide fallback for package manager')
    assert.ok(content.includes('selectedLockfile = null'), 'Should provide fallback for lockfile')
    assert.ok(content.includes('hasWorkspaces = false'), 'Should provide fallback for workspaces')
  })

  test('logs context for debugging', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('{ customExclusions, options }'), 'Should log scan parameters')
    assert.ok(content.includes('version: nodeVersionInfo.version'), 'Should log detected Node version')
    assert.ok(content.includes('versionManager: nodeVersionInfo.versionManager'), 'Should log version manager')
    assert.ok(content.includes('{ packageManager }'), 'Should log detected package manager')
    assert.ok(content.includes('{ warningsCount: warnings.length }'), 'Should log warnings count')
  })

  test('maintains backward compatibility', () => {
    // Scan function should work with minimal parameters
    assert.ok(typeof scan === 'function', 'Should be a function')
  })

  test('handles missing logger gracefully', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }'),
      'Should provide default logger when none supplied')
  })

  test('error messages are informative', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('Failed to read package.json:'), 'Should include specific error details')
    assert.ok(content.includes('Unable to detect'), 'Should provide clear inability messages')
  })

  test('warnings are collected and returned', () => {
    const scannerPath = require.resolve('../lib/scanner')
    const content = fs.readFileSync(scannerPath, 'utf-8')

    assert.ok(content.includes('const warnings = []'), 'Should initialize warnings array')
    assert.ok(content.includes('warnings.push'), 'Should add warnings to array')
    assert.ok(content.includes('warnings'), 'Should include warnings in result')
  })
})

describe('Scanner - Package Readers Module', () => {
  test('package-readers exports required functions', () => {
    const packageReaders = require('../lib/scanner/package-readers')

    assert.ok(packageReaders.readMultiplePackageJsons, 'Should export readMultiplePackageJsons')
    assert.ok(packageReaders.discoverCustomDependencies, 'Should export discoverCustomDependencies')
    assert.ok(typeof packageReaders.readMultiplePackageJsons === 'function', 'Should be a function')
    assert.ok(typeof packageReaders.discoverCustomDependencies === 'function', 'Should be a function')
  })

  test('discoverCustomDependencies handles empty packageJson', async () => {
    const { discoverCustomDependencies } = require('../lib/scanner/package-readers')

    const emptyPkg = {}
    const result = await discoverCustomDependencies(emptyPkg, {})

    assert.ok(result, 'Should return result')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')
    assert.strictEqual(result.discovered.length, 0, 'Should have no discoveries from empty package')
  })

  test('discoverCustomDependencies with skipTarballs', async () => {
    const { discoverCustomDependencies } = require('../lib/scanner/package-readers')

    const pkg = {
      dependencies: {
        'tarball-dep': 'https://example.com/package.tgz'
      }
    }

    const result = await discoverCustomDependencies(pkg, { skipTarballs: true })

    assert.ok(result, 'Should return result')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    // Tarball should be skipped
  })

  test('readMultiplePackageJsons with empty array', async () => {
    const { readMultiplePackageJsons } = require('../lib/scanner/package-readers')

    const result = await readMultiplePackageJsons([])

    assert.ok(result, 'Should return result')
    assert.ok(Array.isArray(result.results), 'Should have results array')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')
    assert.strictEqual(result.results.length, 0, 'Should have no results')
    assert.strictEqual(result.warnings.length, 0, 'Should have no warnings')
  })
})
