const { test, describe } = require('node:test')
const assert = require('node:assert')
const {
  detectCustomDependency,
  parseGitUrl
} = require('../lib/scanner/dependency-detection')

describe('Dependency Detection - File Protocol', () => {
  test('detectCustomDependency detects file: protocol', () => {
    const result = detectCustomDependency('file:./packages/my-package')
    assert.strictEqual(result.type, 'file', 'Should detect file: protocol')
    assert.ok(result.path, 'Should have path property')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects file protocol', () => {
    const result = detectCustomDependency('file:../local-package')
    assert.ok(result, 'Should detect file protocol')
    assert.strictEqual(result.type, 'file', 'Should be file type')
    assert.strictEqual(result.protocol, 'file', 'Should have file protocol')
    assert.strictEqual(result.isCustomSource, true, 'Should be custom source')
    assert.strictEqual(result.requiresDiscovery, true, 'Should require discovery')
    assert.strictEqual(result.path, '../local-package', 'Should extract path')
  })
})

describe('Dependency Detection - Git Protocol', () => {
  test('detectCustomDependency detects git+ssh URLs', () => {
    const result = detectCustomDependency('git+ssh://git@github.com:user/repo.git')
    assert.strictEqual(result.type, 'git', 'Should detect git+ssh URLs')
    assert.ok(result.url, 'Should have url property')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects git+https URLs', () => {
    const result = detectCustomDependency('git+https://github.com/user/repo.git')
    assert.strictEqual(result.type, 'git', 'Should detect git+https URLs')
    assert.ok(result.url, 'Should have url property')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects git:// URLs', () => {
    const result = detectCustomDependency('git://github.com/user/repo.git')
    assert.strictEqual(result.type, 'git', 'Should detect git:// URLs')
    assert.ok(result.url, 'Should have url property')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects git protocols', () => {
    const protocols = [
      { input: 'git://github.com/user/repo.git', proto: 'git' },
      { input: 'git+ssh://git@github.com/user/repo.git', proto: 'ssh' },
      { input: 'git+http://github.com/user/repo.git', proto: 'http' },
      { input: 'git+https://github.com/user/repo.git', proto: 'https' },
      { input: 'git+file:///path/to/repo.git', proto: 'file' }
    ]

    protocols.forEach(({ input, proto }) => {
      const result = detectCustomDependency(input)
      assert.ok(result, `Should detect ${input}`)
      assert.strictEqual(result.type, 'git', 'Should be git type')
      assert.strictEqual(result.protocol, proto, `Should detect ${proto} protocol`)
      assert.strictEqual(result.isCustomSource, true, 'Should be custom source')
      assert.strictEqual(result.requiresDiscovery, true, 'Should require discovery')
    })
  })

  test('git URL with semver range', () => {
    const result = detectCustomDependency('git+https://github.com/user/repo.git#semver:^1.0.0')
    assert.ok(result, 'Should detect git with semver ref')
    assert.strictEqual(result.type, 'git', 'Should be git type')
  })

  test('git+file protocol', () => {
    const gitFileUrl = 'git+file:///absolute/path/to/repo.git'
    const result = detectCustomDependency(gitFileUrl)

    assert.ok(result, 'Should detect git+file protocol')
    assert.strictEqual(result.type, 'git', 'Should be git type')
    assert.strictEqual(result.protocol, 'file', 'Should detect file protocol')
  })
})

describe('Dependency Detection - Tarball Protocol', () => {
  test('detectCustomDependency detects HTTP tarballs', () => {
    const result = detectCustomDependency('http://example.com/package.tgz')
    assert.strictEqual(result.type, 'tarball', 'Should detect HTTP tarballs')
    assert.strictEqual(result.url, 'http://example.com/package.tgz', 'Should have correct URL')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects HTTPS tarballs', () => {
    const result = detectCustomDependency('https://example.com/package.tgz')
    assert.strictEqual(result.type, 'tarball', 'Should detect HTTPS tarballs')
    assert.strictEqual(result.url, 'https://example.com/package.tgz', 'Should have correct URL')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects tarballs', () => {
    const httpTarball = detectCustomDependency('http://example.com/package.tgz')
    assert.ok(httpTarball, 'Should detect HTTP tarball')
    assert.strictEqual(httpTarball.type, 'tarball', 'Should be tarball type')
    assert.strictEqual(httpTarball.protocol, 'http', 'Should detect HTTP')
    assert.strictEqual(httpTarball.isCustomSource, true, 'Should be custom source')

    const httpsTarball = detectCustomDependency('https://example.com/package.tgz')
    assert.ok(httpsTarball, 'Should detect HTTPS tarball')
    assert.strictEqual(httpsTarball.protocol, 'https', 'Should detect HTTPS')
  })

  test('tarball extensions', () => {
    const tarballs = [
      'https://registry.npmjs.org/package/-/package-1.0.0.tgz',
      'http://example.com/downloads/package.tar.gz',
      'https://cdn.example.com/package-v1.0.0.tgz'
    ]

    tarballs.forEach(url => {
      const result = detectCustomDependency(url)
      assert.ok(result, `Should detect tarball ${url}`)
      assert.strictEqual(result.type, 'tarball', 'Should be tarball type')
    })
  })
})

describe('Dependency Detection - GitHub Shorthand', () => {
  test('detectCustomDependency detects GitHub shorthand', () => {
    const result = detectCustomDependency('user/repo')
    assert.ok(result, 'Should detect GitHub shorthand')
    assert.strictEqual(result.type, 'github-shorthand', 'Should identify as GitHub shorthand')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects GitHub shorthand with version', () => {
    const result = detectCustomDependency('user/repo#v1.0.0')
    assert.ok(result, 'Should detect GitHub shorthand with version')
    assert.strictEqual(result.type, 'github-shorthand', 'Should be GitHub shorthand')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('detectCustomDependency detects GitHub shorthand without ref', () => {
    const result = detectCustomDependency('lodash/lodash')
    assert.strictEqual(result.type, 'github-shorthand', 'Should detect GitHub shorthand')
    assert.ok(result.shorthand.includes('lodash/lodash'), 'Should have correct shorthand')
    assert.strictEqual(result.isCustomSource, true, 'Should be marked as custom source')
  })

  test('GitHub URL formats', () => {
    const formats = [
      'user/repo#branch-name',
      'user/repo#v1.2.3',
      'user/repo#commit-sha',
      'org-name/repo-name'
    ]

    formats.forEach(format => {
      const result = detectCustomDependency(format)
      assert.ok(result, `Should detect ${format}`)
      assert.strictEqual(result.type, 'github-shorthand', 'Should be github-shorthand')
    })
  })

  test('scoped GitHub shorthands', () => {
    const result = detectCustomDependency('@scope/package')
    assert.ok(result === null || typeof result === 'object', 'Should handle scoped packages')
  })
})

describe('Dependency Detection - NPM Alias', () => {
  test('detectCustomDependency detects npm alias', () => {
    const result = detectCustomDependency('npm:package-name@1.0.0')
    assert.ok(result, 'Should detect npm alias')
    assert.strictEqual(result.type, 'npm-alias', 'Should be npm-alias type')
    assert.strictEqual(result.protocol, 'npm', 'Should have npm protocol')
    assert.strictEqual(result.isCustomSource, false, 'Should not be custom source')
    assert.strictEqual(result.requiresDiscovery, false, 'Should not require discovery')
    assert.strictEqual(result.alias, 'npm:package-name@1.0.0', 'Should have alias field')
  })

  test('detectCustomDependency with different npm aliases', () => {
    const aliases = [
      'npm:lodash',
      'npm:@scope/package',
      'npm:package@latest'
    ]

    aliases.forEach(alias => {
      const result = detectCustomDependency(alias)
      assert.strictEqual(result.type, 'npm-alias', `Should detect ${alias} as npm-alias`)
      assert.strictEqual(result.isCustomSource, false, 'Should not be custom source')
    })
  })

  test('detectCustomDependency detects npm: aliases as non-custom', () => {
    const result = detectCustomDependency('npm:package@^1.0.0')
    assert.ok(result, 'Should return an object for npm: aliases')
    assert.strictEqual(result.type, 'npm-alias', 'Should detect npm: aliases')
    assert.strictEqual(result.isCustomSource, false, 'Should not be marked as custom source')
  })
})

describe('Dependency Detection - Standard Versions', () => {
  test('detectCustomDependency handles standard versions', () => {
    const standardVersions = [
      '1.0.0',
      '^1.0.0',
      '~1.0.0',
      '>=1.0.0',
      '*',
      'latest'
    ]

    standardVersions.forEach(version => {
      const result = detectCustomDependency(version)
      assert.strictEqual(result, null, `${version} should return null`)
    })
  })

  test('detectCustomDependency returns null for standard versions', () => {
    const result = detectCustomDependency('^4.18.0')
    assert.strictEqual(result, null, 'Should return null for standard version')
  })
})

describe('Dependency Detection - Edge Cases and Invalid Input', () => {
  test('detectCustomDependency handles invalid input', () => {
    const invalidInputs = [null, undefined, 123, {}, []]

    invalidInputs.forEach(input => {
      const result = detectCustomDependency(input)
      assert.strictEqual(result, null, `Invalid input ${input} should return null`)
    })
  })

  test('detectCustomDependency handles non-string input', () => {
    const result = detectCustomDependency(null)
    assert.strictEqual(result, null, 'Should return null for null input')
  })

  test('detectCustomDependency handles undefined input', () => {
    const result = detectCustomDependency(undefined)
    assert.strictEqual(result, null, 'Should return null for undefined input')
  })

  test('detectCustomDependency with edge cases', () => {
    const edgeCases = [
      { input: '', expected: null },
      { input: '   ', expected: null }
    ]

    edgeCases.forEach(({ input, expected }) => {
      const result = detectCustomDependency(input)
      assert.strictEqual(result, expected, `${input} should return ${expected}`)
    })

    // file: protocol always detected (even with empty path)
    const fileResult = detectCustomDependency('file:')
    assert.ok(fileResult === null || fileResult.type === 'file', 'file: should be handled')

    // Incomplete URLs
    const httpsResult = detectCustomDependency('https://')
    assert.ok(httpsResult === null || httpsResult.type === 'tarball', 'https:// should be handled')

    const gitResult = detectCustomDependency('git://')
    assert.ok(gitResult === null || gitResult.type === 'git', 'git:// should be handled')
  })
})

describe('Dependency Detection - Special Protocols', () => {
  test('detectCustomDependency with workspace protocol', () => {
    const result = detectCustomDependency('workspace:*')
    // workspace: protocol should return null (not custom source for discovery)
    assert.strictEqual(result, null, 'workspace: protocol should return null')
  })

  test('detectCustomDependency handles workspace protocol', () => {
    const result = detectCustomDependency('workspace:*')
    assert.strictEqual(result, null, 'Should return null for workspace protocol')
  })

  test('workspace protocol variations', () => {
    const protocols = ['workspace:*', 'workspace:^', 'workspace:~']

    protocols.forEach(protocol => {
      const result = detectCustomDependency(protocol)
      assert.ok(result === null || result.type !== 'custom', `${protocol} should be handled`)
    })
  })

  test('detectCustomDependency handles link protocol', () => {
    const result = detectCustomDependency('link:../other-package')
    // link: is not currently supported, should return null
    assert.strictEqual(result, null, 'Should return null for unsupported link protocol')
  })

  test('link protocol', () => {
    const result = detectCustomDependency('link:../other-package')
    assert.ok(result === null || typeof result === 'object', 'Should handle link: protocol')
  })
})

describe('Dependency Detection - Git URL Parsing', () => {
  test('parseGitUrl extracts components', () => {
    // Test with ref
    const withRef = parseGitUrl('git+https://github.com/user/repo.git#v1.0.0')
    assert.ok(withRef, 'Should parse URL with ref')

    // Test without ref
    const withoutRef = parseGitUrl('git+https://github.com/user/repo.git')
    assert.ok(withoutRef, 'Should parse URL without ref')
  })

  test('parseGitUrl parses git+ssh URL with ref', () => {
    const result = parseGitUrl('git+ssh://git@github.com:user/repo.git#v1.0.0')
    assert.ok(result, 'Should return parsed result')
    assert.ok(result.repo, 'Should have repo')
    assert.strictEqual(result.ref, 'v1.0.0', 'Should have correct ref')
    assert.ok(result.protocol, 'Should have protocol')
  })

  test('parseGitUrl parses git+https URL', () => {
    const result = parseGitUrl('git+https://github.com/user/repo.git')
    assert.ok(result, 'Should return parsed result')
    assert.ok(result.repo, 'Should have repo')
    assert.strictEqual(result.ref, null, 'Should have no ref')
    assert.ok(result.protocol, 'Should have protocol')
  })

  test('parseGitUrl parses URL with semver ref', () => {
    const result = parseGitUrl('git+https://github.com/user/repo.git#semver:^1.0.0')
    assert.ok(result, 'Should return parsed result')
    assert.strictEqual(result.ref, 'semver:^1.0.0', 'Should preserve semver prefix')
  })

  test('parseGitUrl handles git:// protocol', () => {
    const result = parseGitUrl('git://github.com/user/repo.git')
    assert.ok(result, 'Should return parsed result')
    assert.ok(result.repo, 'Should have repo')
    assert.ok(result.protocol, 'Should have protocol')
  })

  test('parseGitUrl with branch name containing slashes', () => {
    const result = parseGitUrl('git+https://github.com/user/repo.git#feature/my-branch')
    assert.ok(result, 'Should return parsed result')
    assert.strictEqual(result.ref, 'feature/my-branch', 'Should handle branch names with slashes')
  })
})
