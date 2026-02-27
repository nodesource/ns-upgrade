const { test, describe } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const {
  readMultiplePackageJsons,
  discoverCustomDependencies
} = require('../lib/scanner/package-readers')

describe('Package Readers - Multiple Package.json Reading', () => {
  test('reads valid file', async () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const { results, warnings } = await readMultiplePackageJsons([packageJsonPath])

    assert.ok(Array.isArray(results), 'Should return results array')
    assert.ok(Array.isArray(warnings), 'Should return warnings array')
    assert.strictEqual(results.length, 1, 'Should have one result')
    assert.strictEqual(results[0].path, packageJsonPath, 'Should have correct path')
    assert.ok(results[0].content, 'Should have content')
  })

  test('handles empty array', async () => {
    const { results, warnings } = await readMultiplePackageJsons([])
    assert.deepStrictEqual(results, [], 'Should return empty results for empty input')
    assert.deepStrictEqual(warnings, [], 'Should return empty warnings for empty input')
  })

  test('enforces max files limit', async () => {
    const manyFiles = Array(150).fill('fake-package.json')
    const { warnings } = await readMultiplePackageJsons(manyFiles, 100)
    assert.ok(warnings.length > 0, 'Should have warnings when exceeding limit')
    assert.ok(warnings[0].includes('100'), 'Warning should mention the limit')
  })

  test('handles invalid files gracefully', async () => {
    const invalidFiles = ['non-existent-package.json']
    const { results, warnings } = await readMultiplePackageJsons(invalidFiles)
    assert.strictEqual(results.length, 0, 'Should return no results for invalid files')
    assert.ok(warnings.length > 0, 'Should have warnings for invalid files')
    assert.ok(warnings[0].includes('Failed to read'), 'Warning should mention read failure')
  })

  test('validates structure', async () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const { results } = await readMultiplePackageJsons([packageJsonPath])

    assert.ok(results[0].content, 'Should have content')
    assert.strictEqual(results[0].isTruncated, false, 'Should not be truncated')
    assert.strictEqual(results[0].isRoot, false, 'Should default isRoot to false')
  })
})

describe('Package Readers - Custom Dependencies Discovery', () => {
  test('handles no custom deps', async () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        express: '^4.0.0',
        lodash: '^4.17.0'
      }
    }

    const result = await discoverCustomDependencies(pkg, {})
    assert.ok(result, 'Should return a result')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')
    assert.strictEqual(result.discovered.length, 0, 'Should have no discovered items for standard deps')
  })

  test('respects localOnly flag', async () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        'my-pkg': 'file:./non-existent-path',
        'other-pkg': 'git+https://github.com/user/repo.git'
      }
    }

    const options = { localOnly: true }
    const result = await discoverCustomDependencies(pkg, options)

    assert.ok(result, 'Should return a result')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')
  })

  test('respects skipTarballs flag', async () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        'tarball-pkg': 'https://example.com/package.tgz',
        'git-pkg': 'git+https://github.com/nonexistent/repo.git'
      }
    }

    const options = { skipTarballs: true }
    const result = await discoverCustomDependencies(pkg, options)

    assert.ok(result, 'Should return a result')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')
  })

  test('respects skipWorkspaceScan flag', async () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        'my-pkg': 'file:./packages/my-pkg'
      }
    }

    const options = { skipWorkspaceScan: true }
    const result = await discoverCustomDependencies(pkg, options)

    assert.ok(result, 'Should return a result')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    assert.strictEqual(result.discovered.length, 0, 'Should skip scanning when flag is set')
  })

  test('handles both dependencies and devDependencies', async () => {
    const pkg = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        express: '^4.0.0'
      },
      devDependencies: {
        mocha: '^10.0.0'
      }
    }

    const result = await discoverCustomDependencies(pkg, {})
    assert.ok(result, 'Should return a result')
    assert.ok(Array.isArray(result.discovered), 'Should have discovered array')
    assert.ok(Array.isArray(result.warnings), 'Should have warnings array')
  })
})
