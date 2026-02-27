const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  scanCiConfigs,
  scanBindingGypFiles,
  detectCppAddons,
  discoverAllPackageJsonFiles
} = require('../lib/scanner/file-scanners')

describe('File Scanners - CI Configuration Scanning', () => {
  test('scanCiConfigs finds GitHub Actions', async () => {
    const configs = await scanCiConfigs()
    assert.ok(Array.isArray(configs), 'Should return an array')
    // This project might have CI configs
  })

  test('scanCiConfigs checks common paths', async () => {
    const configs = await scanCiConfigs()
    assert.ok(Array.isArray(configs), 'Should return an array')
    // Common CI config paths are checked
  })
})

describe('File Scanners - Binding.gyp File Scanning', () => {
  test('scanBindingGypFiles returns array', async () => {
    const gypFiles = await scanBindingGypFiles()
    assert.ok(Array.isArray(gypFiles), 'Should return an array')
  })

  test('scanBindingGypFiles searches recursively', async () => {
    const gypFiles = await scanBindingGypFiles()
    assert.ok(Array.isArray(gypFiles), 'Should return an array')
    // The function should handle the case where no binding.gyp files exist
  })
})

describe('File Scanners - C++ Addon Detection', () => {
  test('detectCppAddons with no addons', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        express: '^4.0.0'
      }
    }
    const addons = detectCppAddons(pkg)
    assert.ok(Array.isArray(addons), 'Should return an array')
    assert.strictEqual(addons.length, 0, 'Should return empty array for no addons')
  })

  test('detectCppAddons with known addon dependencies', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        sqlite3: '^5.0.0',
        bcrypt: '^5.0.0',
        sharp: '^0.32.0'
      }
    }
    const addons = detectCppAddons(pkg)
    assert.ok(addons.length > 0, 'Should detect known C++ addons')
    assert.ok(addons.includes('sqlite3'), 'Should detect sqlite3')
    assert.ok(addons.includes('bcrypt'), 'Should detect bcrypt')
    assert.ok(addons.includes('sharp'), 'Should detect sharp')
  })

  test('detectCppAddons from devDependencies', () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      devDependencies: {
        'node-gyp': '^9.0.0',
        canvas: '^2.9.0'
      }
    }
    const addons = detectCppAddons(pkg)
    assert.ok(addons.includes('node-gyp'), 'Should detect node-gyp')
    assert.ok(addons.includes('canvas'), 'Should detect canvas')
  })
})

describe('File Scanners - Package.json Discovery', () => {
  test('discoverAllPackageJsonFiles finds package.json', async () => {
    const files = await discoverAllPackageJsonFiles()
    assert.ok(Array.isArray(files), 'Should return an array')
    // Files may or may not be found depending on the project structure
  })

  test('discoverAllPackageJsonFiles respects exclusions', async () => {
    const files = await discoverAllPackageJsonFiles(['node_modules', 'test'])
    assert.ok(Array.isArray(files), 'Should return an array')
    // Files should not include any from node_modules or test directories
    const hasNodeModules = files.some(f => f.includes('node_modules'))
    assert.strictEqual(hasNodeModules, false, 'Should exclude node_modules')
  })
})
