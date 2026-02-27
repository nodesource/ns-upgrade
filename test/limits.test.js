const { describe, it, before, after } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const sinon = require('sinon')
const detectors = require('../lib/detectors')

// Stub detectWorkspaces before requiring scanner
// This is necessary because scanner/index.js might use the detector at module load time or we want to ensure the stub is in place
const detectWorkspacesStub = sinon.stub(detectors, 'detectWorkspaces').returns({
  hasWorkspaces: true,
  tools: ['npm'],
  configFiles: []
})

const { scan } = require('../lib/scanner/index.js')

const TEST_DIR = path.join(process.cwd(), 'test/temp_scan_limits')

describe('Scanner Limits', () => {
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_DIR)

    // Create depth 1
    fs.mkdirSync(path.join(TEST_DIR, 'd1'))
    fs.writeFileSync(path.join(TEST_DIR, 'd1', 'package.json'), '{}')

    // Create depth 2
    fs.mkdirSync(path.join(TEST_DIR, 'd1', 'd2'))
    fs.writeFileSync(path.join(TEST_DIR, 'd1', 'd2', 'package.json'), '{}')

    // Create depth 3
    fs.mkdirSync(path.join(TEST_DIR, 'd1', 'd2', 'd3'))
    fs.writeFileSync(path.join(TEST_DIR, 'd1', 'd2', 'd3', 'package.json'), '{}')
  })

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true })
    }
    detectWorkspacesStub.restore()
  })

  it('should respect maxFiles limit', async () => {
    const result = await scan([], {
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      skipWorkspaceScan: false,
      maxFiles: 1
    })

    // Note: The scanner might pick up other files in the repo first, consuming the limit.
    // If maxFiles is 1, it stops after 1 file.
    // So we check the TOTAL length of allPackageJsons.
    assert.strictEqual(result.scannedData.allPackageJsons.length, 1, 'Should find exactly 1 file total')
  })

  it('should respect scanDepth limit', async () => {
    const result = await scan([], {
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      skipWorkspaceScan: false,
      scanDepth: 2
    })

    // Our test files are at:
    // d1/package.json (depth relative to test/temp_scan_limits is 1, but relative to cwd it is deeper)
    // cwd is project root.
    // test/temp_scan_limits/d1/package.json
    // test is depth 1
    // temp_scan_limits is depth 2
    // d1 is depth 3
    // package.json is depth 4?

    // Let's check what depth 2 finds. It should find files in root (depth 0/1) and maybe depth 2.
    // It should NOT find our deep test files.

    const testFiles = result.scannedData.allPackageJsons.filter(p => p.path.includes('temp_scan_limits'))
    assert.strictEqual(testFiles.length, 0, 'Should not find deep test files with shallow scan')
  })

  it('should find files with sufficient depth', async () => {
    // Calculate depth of our test dir
    const relPath = path.relative(process.cwd(), path.join(TEST_DIR, 'd1', 'd2', 'd3', 'package.json'))
    const depth = relPath.split(path.sep).length

    const result = await scan([], {
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      skipWorkspaceScan: false,
      scanDepth: depth + 2 // Give plenty of depth
    })

    const testFiles = result.scannedData.allPackageJsons.filter(p => p.path.includes('temp_scan_limits'))
    assert.ok(testFiles.length >= 3, 'Should find all 3 test files with sufficient depth')
  })
})
