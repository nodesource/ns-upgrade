# Output System Architecture

## System Overview

The output system is responsible for processing collected data from the Node.js upgrade analysis tool and generating structured output in various formats. The system handles data assembly, validation, file operations, and multiple output destinations (file, console, buffer) with a focus on modularity, testability, and backward compatibility.

## Directory Structure

The output system is organized in the `lib/output/` directory with the following structure:

```
lib/output/
├── index.js              # Main orchestrator and public API
├── file-operations.js    # File system operations with dependency injection
├── output-handlers.js    # Strategy pattern for different output types
└── output-processor.js   # Data assembly and validation logic
```

### Import Patterns

```javascript
// Main API - import the orchestrator
const { generate, createLogger, assembleOutput, getOutputPath, promptOverwrite } = require('../lib/output')

// Individual modules - for testing or advanced usage
const { processOutput } = require('../lib/output/output-processor')
const { createOutputHandler } = require('../lib/output/output-handlers')
const { getOutputPath, writeContent } = require('../lib/output/file-operations')
```

## Core Architecture

### Modular Design Pattern

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/output/      │───▶│lib/output/       │───▶│ lib/schema.js   │
│   index.js      │    │output-processor  │    │  (Validation)   │
│  (Orchestrator) │    │     .js          │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/output/      │    │lib/output/       │    │ lib/utils.js    │
│output-handlers  │    │file-operations   │    │ (File System)   │
│     .js         │    │     .js          │    │                 │
│ (Strategy)      │    │ (I/O Layer)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Module Responsibilities

### 1. `lib/output/output-processor.js` - Data Assembly & Validation Layer

**Technical Implementation:**
- Pure functions for data transformation
- Schema validation using Zod
- Immutable data assembly patterns
- Comprehensive error handling with context

**Core Functions:**
```javascript
function assembleOutput(userInput, scanData, analysisData) -> OutputObject
function validateOutput(output, logger) -> ValidatedOutput
function processOutput(userInput, scanData, analysisData, logger) -> ValidatedOutput
```

**Data Assembly Structure:**
```javascript
{
  schemaVersion: '1.2.0',
  generatedAt: '2024-01-01T00:00:00.000Z',
  projectInfo: {
    currentNodeVersion: '20',
    targetLtsVersion: '22',
    packageManager: { name: 'npm', version: '10.0.0' },
    environments: {
      developmentOS: ['macOS'],
      productionOS: ['Ubuntu Linux'],
      ciEnvironment: 'github'
    },
    hasWorkspaces: false
  },
  scannedData: {
    packageJson: { content: {...}, isTruncated: false },
    allPackageJsons: [],
    lockfile: { name: 'package-lock.json', content: '...', isTruncated: false },
    lockfilesDetected: ['package-lock.json'],
    ciConfigsFound: ['.github/workflows/ci.yml'],
    cppAddons: {
      gypFilesFound: [],
      cmakeListsFound: [],
      dependenciesFound: []
    }
  },
  staticApiAnalysis: {
    status: 'success',
    error: null,
    findings: []
  },
  warnings: [],
  additionalNotes: 'User provided notes'
}
```

**Validation Strategy:**
- Schema version enforcement (1.1.0)
- Required field validation
- Type checking and format validation
- Nested object validation
- Error messages with detailed context

### 2. `lib/output/file-operations.js` - File System Abstraction Layer

**Technical Implementation:**
- Dependency injection pattern for testing
- Path operations abstraction
- File system operation wrappers
- Error handling with descriptive messages

**Core Functions:**
```javascript
function getOutputPath(customPath, pathOps) -> ResolvedPath
function checkFileExists(filePath, fileOps) -> boolean
function validateDirectory(filePath, fileOps) -> void
function writeContent(filePath, content, fileOps) -> void
```

**Dependency Injection Benefits:**
```javascript
// Production usage
const { getOutputPath } = require('../lib/output/file-operations')
const path = getOutputPath('/custom/output.json')

// Testing usage with mocks
const mockFileOps = {
  resolve: (p) => p,
  join: (...args) => args.join('/'),
  fileExists: () => false,
  validateOutputDirectory: () => {},
  writeFile: () => {}
}
const path = getOutputPath('/custom/output.json', mockFileOps)
```

**Default Operations:**
- Uses Node.js `path` module for path resolution
- Integrates with `lib/utils.js` for file operations
- Handles both absolute and relative paths
- Defaults to `nodesource-discovery.json` in current working directory

### 3. `lib/output/output-handlers.js` - Strategy Pattern Implementation

**Technical Implementation:**
- Strategy pattern for multiple output types
- Class-based handler architecture
- Dependency injection for file operations
- Consistent interface across all handlers

**Handler Classes:**
```javascript
class BaseOutputHandler {
  async handle(options) {
    throw new Error('handle method must be implemented')
  }
}

class FileOutputHandler extends BaseOutputHandler {
  constructor(fileOps, promptRunner)
  async handle({ filePath, content, logger, forceOverwrite })
}

class ConsoleOutputHandler extends BaseOutputHandler {
  async handle({ content, logger })
}

class BufferOutputHandler extends BaseOutputHandler {
  async handle({ content, logger })
  getBuffer() -> string
  clearBuffer() -> void
}
```

**Strategy Factory:**
```javascript
function createOutputHandler(type, fileOps, promptRunner) {
  switch (type) {
    case 'file': return new FileOutputHandler(fileOps, promptRunner)
    case 'console': return new ConsoleOutputHandler()
    case 'buffer': return new BufferOutputHandler()
    default: throw new Error(`Unknown output handler type: ${type}`)
  }
}
```

**Handler Behaviors:**
- **File Handler**: Validates directory, checks file existence, prompts for overwrite, writes to disk
- **Console Handler**: Direct output to stdout with logging
- **Buffer Handler**: Stores content in memory for testing purposes

### 4. `lib/output/index.js` - Orchestration & API Layer

**Technical Implementation:**
- Composition pattern integrating all modules
- Backward compatibility preservation
- Dependency injection for testing
- Comprehensive error handling

**Primary API:**
```javascript
async function generate(options) {
  const {
    userInput,      // User responses from prompts
    scanData,        // Data from scanner
    analysisData,    // Data from analyzer
    outputPath,      // Custom output path (optional)
    logger,          // Logger instance (optional)
    fileOps,         // File operations (for testing)
    promptRunner,    // Prompt runner (for testing)
    outputType,      // 'file', 'console', 'buffer'
    forceOverwrite   // Skip overwrite prompt
  } = options

  // 1. Process and validate output data
  const validatedOutput = processOutput(userInput, scanData, analysisData, logger)

  // 2. Convert to JSON string
  const jsonContent = JSON.stringify(validatedOutput, null, 2)

  // 3. Create and execute output handler
  const handler = createOutputHandler(outputType, fileOps, promptRunner)
  const result = await handler.handle({...})

  return { success: true, output: validatedOutput, ...result }
}
```

**Backward Compatibility API:**
```javascript
function assembleOutput(userInput, scanData, analysisData) -> OutputObject
function getOutputPath(customPath) -> string
function promptOverwrite(filePath, logger) -> Promise<boolean>
function createLogger(logger) -> LoggerInstance
```

## Data Flow Architecture

### Request Processing Pipeline

```
Input: { userInput, scanData, analysisData, options }
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Data Processing & Validation                          │
│    - Assemble output object from all data sources       │
│    - Validate against schema (version 1.1.0)           │
│    - Transform and normalize data structures            │
│    - Log processing steps and validation results       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Output Type Selection                                 │
│    - Determine output destination (file/console/buffer) │
│    - Create appropriate handler via factory pattern     │
│    - Inject dependencies (fileOps, promptRunner)       │
│    - Configure handler with options                     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Output Execution                                      │
│    - File: Validate directory, check existence, prompt   │
│    - Console: Direct stdout output                      │
│    - Buffer: Store in memory for testing                │
│    - Handle errors and log operations                   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
Output: { success, filePath/content, output, metadata }
```

### State Management

The system is designed for stateless operation:
- No global variables or mutable state between calls
- All data flows through function parameters and return values
- Dependencies are explicitly injected
- Only the BufferHandler maintains temporary state for testing

## Error Handling Strategy

### Layered Error Handling

```javascript
// Processing Layer (output-processor.js)
function processOutput(...) {
  try {
    const output = assembleOutput(...)
    return validateOutput(output, logger)
  } catch (error) {
    log.error('Output processing failed', error)
    throw error
  }
}

// Handler Layer (output-handlers.js)
class FileOutputHandler {
  async handle(options) {
    try {
      this.fileOps.validateDirectory(filePath)
      // ... file operations
    } catch (error) {
      log.error('File output failed', error)
      throw error
    }
  }
}

// Orchestration Layer (index.js)
async function generate(options) {
  try {
    // ... orchestration logic
  } catch (error) {
    log.error('Output generation failed', error)
    throw error
  }
}
```

### Error Categories
1. **Validation Errors**: Schema validation failures with detailed field information
2. **File System Errors**: Directory validation, write permissions, disk space
3. **User Cancellation**: Overwrite prompt cancellation (graceful handling)
4. **Configuration Errors**: Invalid output types, missing required data
5. **Dependency Errors**: Missing or invalid injected dependencies

## Performance Characteristics

### Memory Usage
- **Pure Functions**: Minimal object retention in processors
- **Stream Processing**: Large files handled through streaming writes
- **Buffer Handler**: Optional in-memory storage for testing
- **Dependency Injection**: No singleton patterns or global state

### Execution Time
- **Data Assembly**: O(n) where n = number of data fields
- **Schema Validation**: O(m) where m = complexity of output object
- **File Operations**: I/O bound, optimized for single write operation
- **Handler Selection**: O(1) factory pattern lookup

### Scalability Considerations
- **Output Type Addition**: New handlers via factory pattern
- **Schema Evolution**: Versioned schema support
- **File Operation Extension**: Inject custom file operations
- **Validation Enhancement**: Extend schema without breaking changes

## Integration Points

### External Dependencies
- **lib/schema.js**: Zod schema validation (version 1.1.0)
- **lib/utils.js**: File system operations (validateOutputDirectory, writeFile, fileExists)
- **lib/prompts/prompt-overwrite.js**: File overwrite prompting
- **Node.js path module**: Path resolution and manipulation

### API Surface

```javascript
// Primary modern API
async function generate(options) -> GenerationResult

// Legacy compatibility API
function assembleOutput(userInput, scanData, analysisData) -> OutputObject
function getOutputPath(customPath) -> string
async function promptOverwrite(filePath, logger) -> boolean

// Utility API
function createLogger(logger) -> LoggerInstance
```

### Data Contracts

```typescript
interface GenerationOptions {
  userInput: UserInputData
  scanData: ScannerData
  analysisData: AnalyzerData
  outputPath?: string
  logger?: Logger
  fileOps?: FileOperations
  promptRunner?: PromptRunner
  outputType?: 'file' | 'console' | 'buffer'
  forceOverwrite?: boolean
}

interface GenerationResult {
  success: boolean
  output: ValidatedOutput
  filePath?: string
  outputType?: string
  sizeBytes?: number
  destination?: string
}
```

## Testing Architecture

### Test Strategy by Module

1. **output-processor.js**: Data assembly and validation matrices
2. **file-operations.js**: Mock injection for file system operations
3. **output-handlers.js**: Strategy pattern testing with all handler types
4. **index.js**: Integration testing with all dependencies mocked

### Mock Implementation Pattern

```javascript
// File operations mock
const mockFileOps = {
  validateOutputDirectory: () => {},
  writeFile: (path, content) => {},
  fileExists: () => false,
  resolve: (path) => path,
  join: (...args) => args.join('/')
}

// Prompt runner mock
const mockPromptRunner = {
  promptOverwrite: async () => true
}

// Test execution
const result = await generate({
  userInput,
  scanData,
  analysisData,
  outputType: 'buffer',
  fileOps: mockFileOps,
  promptRunner: mockPromptRunner
})
```

### Test Coverage Areas
- **Happy Path**: Normal operation with all output types
- **Error Conditions**: Validation failures, file system errors
- **Edge Cases**: Empty data, large files, special characters
- **Backward Compatibility**: Legacy API function behavior
- **Dependency Injection**: Mock behavior verification

## Backward Compatibility

### Legacy API Support

The system maintains full backward compatibility with the original monolithic API:

```javascript
// Original usage patterns still work
const output = assembleOutput(userInput, scanData, analysisData)
const path = getOutputPath('/custom/path.json')
const proceed = await promptOverwrite(path, logger)
```

### Migration Path

```javascript
// Legacy approach
const output = assembleOutput(userInput, scanData, analysisData)
const json = JSON.stringify(output, null, 2)
writeFile(getOutputPath(), json)

// Modern approach
const result = await generate({
  userInput,
  scanData,
  analysisData,
  outputPath: '/custom/path.json',
  outputType: 'file'
})
```

This architecture provides a robust, testable, and maintainable foundation for generating structured output in the Node.js upgrade analysis tool while preserving backward compatibility and supporting multiple output destinations.
