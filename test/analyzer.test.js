const { test, describe } = require('node:test')
const assert = require('node:assert')
const { buildEslintConfig } = require('../lib/scanner/analyzer')

describe('Analyzer - ESLint Configuration', () => {
  test('buildEslintConfig for Node.js 20', () => {
    const config = buildEslintConfig('20')
    assert.ok(config.overrideConfig, 'Config should have overrideConfig')
    assert.ok(Array.isArray(config.overrideConfig), 'overrideConfig should be an array')
    const baseConfig = config.overrideConfig[0]
    assert.ok(baseConfig.languageOptions.globals.process, 'Should have Node.js globals configured')
    assert.ok(baseConfig.plugins.n, 'Should have eslint-plugin-n configured')
  })

  test('buildEslintConfig for Node.js 22', () => {
    const config = buildEslintConfig('22')
    const baseConfig = config.overrideConfig[0]
    assert.ok(baseConfig.rules['n/no-unsupported-features/es-syntax'], 'Should have unsupported features rule')
    assert.strictEqual(baseConfig.rules['n/no-unsupported-features/es-syntax'][1].version, '22', 'Should set version to 22')
  })

  test('buildEslintConfig for Node.js 24', () => {
    const config = buildEslintConfig('24')
    const baseConfig = config.overrideConfig[0]
    assert.strictEqual(baseConfig.rules['n/no-unsupported-features/es-syntax'][1].version, '24', 'Should set version to 24')
  })

  test('has deprecated API rule', () => {
    const config = buildEslintConfig('20')
    const baseConfig = config.overrideConfig[0]
    assert.strictEqual(baseConfig.rules['n/no-deprecated-api'], 'error', 'Should have deprecated API rule set to error')
  })

  test('uses no eslintrc', () => {
    const config = buildEslintConfig('20')
    assert.strictEqual(config.overrideConfigFile, true, 'Should override config file')
  })

  test('disables eslintignore handling to avoid ESLint 9 deprecation warnings', () => {
    const config = buildEslintConfig('20')
    assert.strictEqual(config.ignore, false, 'Should disable ignore file processing')
    assert.strictEqual(config.warnIgnored, false, 'Should disable warnIgnored')
    assert.strictEqual(config.errorOnUnmatchedPattern, false, 'Should not error on unmatched patterns')
  })

  test('has TypeScript configuration', () => {
    const config = buildEslintConfig('20')
    const tsConfig = config.overrideConfig[1]
    assert.ok(tsConfig, 'Should have TypeScript configuration')
    assert.ok(tsConfig.files, 'Should specify TypeScript files')
    assert.ok(tsConfig.files.includes('**/*.ts'), 'Should include .ts files')
    assert.ok(tsConfig.languageOptions.parser, 'Should have TypeScript parser')
  })

  test('has all Node.js globals', () => {
    const config = buildEslintConfig('20')
    const baseConfig = config.overrideConfig[0]
    const globals = baseConfig.languageOptions.globals
    assert.strictEqual(globals.process, 'readonly', 'Should have process global')
    assert.strictEqual(globals.Buffer, 'readonly', 'Should have Buffer global')
    assert.strictEqual(globals.__dirname, 'readonly', 'Should have __dirname global')
    assert.strictEqual(globals.require, 'readonly', 'Should have require global')
  })

  test('sets ecmaVersion to 2024', () => {
    const config = buildEslintConfig('20')
    const baseConfig = config.overrideConfig[0]
    assert.strictEqual(baseConfig.languageOptions.ecmaVersion, 2024, 'Should use ecmaVersion 2024')
  })

  test('sets sourceType to module', () => {
    const config = buildEslintConfig('20')
    const baseConfig = config.overrideConfig[0]
    assert.strictEqual(baseConfig.languageOptions.sourceType, 'module', 'Should use module sourceType')
  })
})

describe('Analyzer - File Discovery', () => {
  test('discoverFiles returns array', async () => {
    const { discoverFiles } = require('../lib/scanner/analyzer')
    const files = await discoverFiles([])
    assert.ok(Array.isArray(files), 'Should return an array')
  })

  test('discoverFiles with exclusions', async () => {
    const { discoverFiles } = require('../lib/scanner/analyzer')
    const files = await discoverFiles(['test/**', 'node_modules/**'])
    assert.ok(Array.isArray(files), 'Should return an array with exclusions')
  })

  test('discoverFiles finds JavaScript files', async () => {
    const { discoverFiles } = require('../lib/scanner/analyzer')
    const files = await discoverFiles([])
    // Should find at least some JavaScript files in this project
    if (files.length > 0) {
      assert.ok(files.some(f => f.endsWith('.js')), 'Should find .js files')
    }
  })

  test('discoverFiles properly excludes files', async () => {
    const { discoverFiles } = require('../lib/scanner/analyzer')
    const files = await discoverFiles(['node_modules/**', 'test/**'])
    assert.ok(Array.isArray(files), 'Should return an array')
    // Files should not include node_modules or test directories
    const hasExcluded = files.some(f => f.includes('node_modules') || f.includes('/test/'))
    assert.strictEqual(hasExcluded, false, 'Should not include excluded files')
  })
})

describe('Analyzer - Analysis Execution', () => {
  test('runAnalysis returns expected structure', async () => {
    const { runAnalysis, buildEslintConfig } = require('../lib/scanner/analyzer')
    const config = buildEslintConfig('20')

    // Test with empty array
    const result = await runAnalysis([], config, 1000)
    assert.ok(result, 'Should return a result')
    assert.ok('status' in result, 'Should have status property')
    assert.ok('findings' in result, 'Should have findings property')
    assert.ok(Array.isArray(result.findings), 'Findings should be an array')
  })

  test('runAnalysis returns proper structure', async () => {
    const { runAnalysis, buildEslintConfig, discoverFiles } = require('../lib/scanner/analyzer')
    const config = buildEslintConfig('20', [])
    const files = await discoverFiles(['**/*'])
    // Test with small file list to avoid timeout
    const limitedFiles = files.slice(0, 5)
    if (limitedFiles.length > 0) {
      const result = await runAnalysis(limitedFiles, config)
      assert.ok(result, 'Should return result')
      assert.ok('status' in result, 'Should have status')
      assert.ok(['success', 'failed', 'timeout'].includes(result.status), 'Status should be valid')
      assert.ok(Array.isArray(result.findings), 'Should have findings array')
    }
  })

  test('analyze handles empty file list', async () => {
    const { analyze } = require('../lib/scanner/analyzer')
    // Test with version and custom exclusions that won't match any files
    const result = await analyze('20', ['**/*'], { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} })
    assert.ok(result, 'Should return result')
    assert.ok('status' in result, 'Should have status')
    assert.ok('findings' in result, 'Should have findings')
    assert.ok(Array.isArray(result.findings), 'Findings should be an array')
  })
})

describe('Analyzer - Module Exports', () => {
  test('analyze function exports', () => {
    const { analyze } = require('../lib/scanner/analyzer')
    assert.ok(typeof analyze === 'function', 'Should export analyze function')
  })

  test('module exports all expected functions', () => {
    const analyzer = require('../lib/scanner/analyzer')
    assert.ok(analyzer.analyze, 'Should export analyze')
    assert.ok(analyzer.discoverFiles, 'Should export discoverFiles')
    assert.ok(analyzer.buildEslintConfig, 'Should export buildEslintConfig')
    assert.ok(analyzer.runAnalysis, 'Should export runAnalysis')
    assert.strictEqual(typeof analyzer.analyze, 'function', 'analyze should be a function')
    assert.strictEqual(typeof analyzer.discoverFiles, 'function', 'discoverFiles should be a function')
    assert.strictEqual(typeof analyzer.buildEslintConfig, 'function', 'buildEslintConfig should be a function')
    assert.strictEqual(typeof analyzer.runAnalysis, 'function', 'runAnalysis should be a function')
  })

  test('buildEslintConfig structure validation', () => {
    const { buildEslintConfig } = require('../lib/scanner/analyzer')
    const config = buildEslintConfig('20')
    assert.ok(config.overrideConfig, 'Should have overrideConfig')
    assert.ok(Array.isArray(config.overrideConfig), 'overrideConfig should be an array')
    assert.strictEqual(config.overrideConfigFile, true, 'Should override config file')
    // Check that config has base and ts configs
    assert.ok(config.overrideConfig.length >= 2, 'Should have at least 2 configs (base and ts)')
  })
})
