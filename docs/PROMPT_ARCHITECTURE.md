# Prompt System Architecture

## System Overview

The prompt system is responsible for collecting user input through interactive command-line prompts and transforming it into structured data for the Node.js upgrade analysis tool. The system processes Node.js version information, operating system preferences, CI/CD configurations, and additional project context.

## Directory Structure

The prompt system is organized in the `lib/prompts/` directory with the following structure:

```
lib/prompts/
├── index.js              # Main orchestrator and public API
├── prompt-config.js      # Prompt configuration factory
├── prompt-runner.js      # Prompt execution with dependency injection
├── prompt-overwrite.js   # File overwrite prompting (used by output module)
└── answer-processor.js   # Raw answer transformation
```

### Import Patterns

```javascript
// Main API - import the orchestrator
const { ask, collectAnswers, preparePromptContext } = require('../lib/prompts')

// Individual modules - for testing or advanced usage
const { createPromptConfig } = require('../lib/prompts/prompt-config')
const { runPrompts } = require('../lib/prompts/prompt-runner')
const { processAnswers } = require('../lib/prompts/answer-processor')
```

## Core Architecture

### Modular Design Pattern

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/prompts/     │───▶│lib/prompts/      │───▶│ lib/validators.  │
│   index.js      │    │prompt-config.js  │    │      js          │
│  (Orchestrator) │    │  (Configuration) │    │  (Validation)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│lib/prompts/     │    │lib/prompts/       │    │   lib/constants  │
│prompt-runner.js │    │answer-processor   │    │      .js         │
│ (Execution)     │    │   .js             │    │   (Data)         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Module Responsibilities

### 1. `lib/validators.js` - Input Validation Layer

**Technical Implementation:**
- Pure functions with no side effects
- Regex-based validation for version strings
- Length and format validation for text inputs
- Array validation for multi-select inputs

**Key Validation Functions:**
```javascript
validateCustomNodeVersion(answer) // Validates: 21, 23, 21.5.0, v21, v23, v21.5.0
validateCustomOS(answer)         // Validates non-empty OS names
validateAdditionalNotes(answer)  // Validates ≤500 character limit
validateOSSelection(answer)      // Validates at least one OS selected
extractMajorVersion(version)     // Extracts "20" from "v20.10.0"
```

**Validation Rules:**
- Node.js versions: `^\d+(\.\d+)?(\.\d+)?$` or `^v?\d+(\.\d+)?(\.\d+)?$`
- OS names: Non-empty strings after trimming
- Notes: Maximum 500 characters
- OS selection: Array must contain at least one item

### 2. `lib/prompts/prompt-config.js` - Configuration Factory

**Technical Implementation:**
- Factory pattern for prompt configuration generation
- Conditional question logic using `when` functions
- Dynamic message generation based on detected context
- Integration with validators for real-time validation

**Configuration Structure:**
```javascript
[
  {
    type: 'list',           // Single selection
    name: 'currentNodeVersion',
    message: 'What is your app\'s current Node.js version?',
    choices: CURRENT_NODE_VERSIONS,  // From constants.js
    default: detectedMajor || '20',
    validate: validateCustomNodeVersion  // Conditional validation
  },
  {
    type: 'input',          // Text input
    name: 'currentNodeVersionCustom',
    message: 'Please specify your current Node.js version:',
    when: (answers) => answers.currentNodeVersion === 'custom',
    validate: validateCustomNodeVersion
  },
  {
    type: 'checkbox',       // Multi-selection
    name: 'productionOS',
    message: 'What OS does your app run on in Production?',
    choices: PRODUCTION_OS_OPTIONS,
    default: ['Ubuntu Linux'],
    validate: validateOSSelection
  }
  // ... 6 additional questions
]
```

**Dynamic Features:**
- Messages adapt when Node.js version is pre-detected
- Conditional questions appear based on previous answers
- Default values intelligently selected from detected context

### 3. `lib/prompts/prompt-runner.js` - Execution Layer

**Technical Implementation:**
- Dependency injection pattern for inquirer module
- Dynamic ESM import handling
- Async/await pattern for prompt execution
- Error isolation and propagation

**Execution Flow:**
```javascript
async function runPrompts(promptConfig, inquirerLoader = defaultInquirerLoader) {
  const inquirer = await inquirerLoader()  // Injected dependency
  return await inquirer.prompt(promptConfig)
}

async function defaultInquirerLoader() {
  const inquirer = await import('inquirer')  // Dynamic ESM import
  return inquirer.default
}
```

**Injection Benefits:**
- Testing: Mock inquirer for unit tests
- Flexibility: Swap prompt libraries
- Isolation: Separate business logic from UI framework

### 4. `lib/prompts/answer-processor.js` - Data Transformation Layer

**Technical Implementation:**
- Pure function transformation pipeline
- Conditional logic for custom inputs
- Data normalization and mapping
- Immutable transformation patterns

**Transformation Logic:**
```javascript
function processAnswers(answers) {
  return {
    // Custom version overrides standard selection
    currentNodeVersion: answers.currentNodeVersionCustom || answers.currentNodeVersion,

    // Direct mapping for target version
    targetLtsVersion: answers.targetLtsVersion,

    // Replace "Other" with custom OS names
    productionOS: answers.productionOSCustom
      ? answers.productionOS.map(os => os === 'Other' ? answers.productionOSCustom : os)
      : answers.productionOS,

    // Same pattern for development OS
    developmentOS: answers.developmentOSCustom
      ? answers.developmentOS.map(os => os === 'Other' ? answers.developmentOSCustom : os)
      : answers.developmentOS,

    // Map display names to internal identifiers
    ciEnvironment: CI_SYSTEMS[answers.ciEnvironment],  // "GitHub Actions" → "github"

    // Text normalization
    additionalNotes: answers.additionalNotes.trim()
  }
}
```

### 5. `lib/prompts/index.js` - Orchestration Layer

**Technical Implementation:**
- Composition pattern integrating all modules
- Async orchestration with error handling
- Logger injection and management
- Backward compatibility preservation

**Orchestration Flow:**
```javascript
async function ask(detectedNodeVersion, logger, inquirerLoader) {
  const log = createLogger(logger)

  try {
    // 1. Prepare context from detected version
    const { detectedMajor } = preparePromptContext(detectedNodeVersion, logger)

    // 2. Generate prompt configuration
    const promptConfig = createPromptConfig(detectedNodeVersion, detectedMajor)

    // 3. Execute prompts with injected dependencies
    const answers = await runPrompts(promptConfig, inquirerLoader)

    // 4. Process and transform answers
    const processedAnswers = processAnswers(answers)

    return processedAnswers
  } catch (error) {
    log.error('Prompt collection failed', error)
    throw error
  }
}
```

## Data Flow Architecture

### Request Processing Pipeline

```
Input: detectedNodeVersion?
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Context Preparation                                   │
│    - Extract major version from detected version        │
│    - Create logger with fallback                        │
│    - Log debugging information                          │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Configuration Generation                              │
│    - Create prompt configuration array                  │
│    - Set conditional logic and validators               │
│    - Configure defaults and messages                    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Prompt Execution                                      │
│    - Load inquirer via dependency injection             │
│    - Execute interactive prompts                        │
│    - Handle user input and validation                   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Answer Processing                                     │
│    - Transform raw answers to structured format         │
│    - Handle custom inputs and conditional fields        │
│    - Map display names to internal identifiers          │
└─────────────────────────────────────────────────────────┘
         │
         ▼
Output: Processed user responses
```

### State Management

The system is stateless by design:
- No global variables or mutable state
- All data flows through function parameters and return values
- Context is passed explicitly through the call chain
- Logging is the only side effect (injected dependency)

## Error Handling Strategy

### Layered Error Handling

```javascript
// Validation Layer (lib/validators.js)
function validateCustomNodeVersion(answer) {
  if (invalid) return 'Error message'  // Return error, don't throw
  return true
}

// Execution Layer (lib/prompts/prompt-runner.js)
async function runPrompts(config, loader) {
  try {
    const inquirer = await loader()
    return await inquirer.prompt(config)
  } catch (error) {
    throw error  // Propagate to orchestrator
  }
}

// Orchestration Layer (lib/prompts/index.js)
async function ask(...) {
  try {
    // Business logic
  } catch (error) {
    log.error('Operation failed', error)  // Log and re-throw
    throw error
  }
}
```

### Error Categories
1. **Validation Errors**: Returned as strings, handled by inquirer
2. **Import Errors**: Caught and re-thrown with context
3. **Execution Errors**: Logged and propagated to caller
4. **Configuration Errors**: Thrown immediately with descriptive messages

## Performance Characteristics

### Memory Usage
- **Pure Functions**: No object retention between calls
- **Dynamic Imports**: Inquirer loaded only when needed
- **Minimal State**: Only logging objects persist temporarily

### Execution Time
- **Validation**: O(1) regex operations
- **Configuration Generation**: O(n) where n = number of questions
- **Prompt Execution**: User-dependent, no computational bottleneck
- **Answer Processing**: O(m) where m = number of conditional fields

### Scalability Considerations
- **Question Addition**: New questions require minimal code changes
- **Validation Extension**: Add new validators without affecting existing code
- **Custom Processing**: Extend answer processor for new data transformations

## Integration Points

### External Dependencies
- **inquirer**: Interactive command-line prompts (ESM module)
- **lib/constants.js**: Question choices and CI system mappings
- **lib/logger.js**: Structured logging with injection support
- **lib/validators.js**: Input validation functions

### API Surface
```javascript
// Primary public API
async function ask(detectedNodeVersion?, logger?, inquirerLoader?) -> ProcessedAnswers

// Secondary APIs (for testing or advanced usage)
async function collectAnswers(detectedNodeVersion, logger, inquirerLoader) -> RawAnswers
function preparePromptContext(detectedNodeVersion, logger) -> Context
function createLogger(logger) -> LoggerInstance
```

### Data Contracts
```typescript
interface ProcessedAnswers {
  currentNodeVersion: string      // "20" | "21" | "custom"
  targetLtsVersion: string        // "20" | "22" | "24"
  productionOS: string[]          // ["Ubuntu Linux", "Custom Linux"]
  developmentOS: string[]         // ["macOS", "Windows"]
  ciEnvironment: string           // "github" | "jenkins" | "none"
  additionalNotes: string         // Trimmed user notes
}

interface RawAnswers {
  currentNodeVersion: string
  currentNodeVersionCustom?: string
  targetLtsVersion: string
  productionOS: string[]
  productionOSCustom?: string
  developmentOS: string[]
  developmentOSCustom?: string
  ciEnvironment: string
  additionalNotes: string
}
```

## Testing Architecture

### Test Strategy by Module

1. **lib/validators.js**: Unit tests with input/output matrices
2. **lib/prompts/prompt-config.js**: Configuration structure validation
3. **lib/prompts/prompt-runner.js**: Mock injection testing
4. **lib/prompts/answer-processor.js**: Transformation pipeline testing
5. **lib/prompts/index.js**: Integration testing with all dependencies mocked

### Mock Implementation Pattern
```javascript
// Test setup
const mockInquirer = {
  prompt: async (config) => expectedAnswers
}

const mockLogger = {
  debug: () => {},
  info: () => {},
  error: () => {}
}

// Test execution
const result = await ask('v20.10.0', mockLogger, async () => mockInquirer)
assert.strictEqual(result.currentNodeVersion, '21')
```

This architecture provides a robust, testable, and maintainable foundation for collecting user input in the Node.js upgrade analysis tool.
