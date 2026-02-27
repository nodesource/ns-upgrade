# Logging System Documentation

## Overview

The `--log` flag enables detailed logging of all CLI operations, providing comprehensive visibility into the execution flow for debugging, troubleshooting, and audit purposes.

## Usage

### Basic Usage

```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log ./upgrade-log.txt
```

### Short Form

```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade -l ./upgrade-log.txt
```

### Combined with Other Flags

```bash
# Log with custom output path
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade \
  --log debug.log \
  --output ./reports/discovery.json

# Log with local-only mode
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade \
  --log local-scan.log \
  --local-only

# Log with exclusions
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade \
  --log scan.log \
  --exclude vendor \
  --exclude legacy
```

## Log File Format

The log file contains timestamped entries in the following format:

```
=== Node.js Upgrade Advisor Log ===
Started at: 2024-11-11T20:30:00.000Z

[2024-11-11T20:30:00.123Z] [+0.00s] [INFO] CLI started
  Data: {
    "flags": {
      "version": false,
      "output": null,
      "exclude": [],
      "skipWorkspaceScan": false,
      "localOnly": false,
      "skipTarballs": false,
      "log": "./upgrade-log.txt"
    },
    "nodeVersion": "v22.11.0",
    "cwd": "/home/user/my-project"
  }

============================================================
[2024-11-11T20:30:00.150Z] [+0.03s] [INFO] Starting operation: Display Welcome and TOS
============================================================

[2024-11-11T20:30:02.345Z] [+2.22s] [INFO] Completed operation: Display Welcome and TOS [SUCCESS]
------------------------------------------------------------

============================================================
[2024-11-11T20:30:02.350Z] [+2.23s] [INFO] Starting operation: Validate package.json
============================================================

[2024-11-11T20:30:02.365Z] [+2.24s] [DEBUG] Reading package.json
[2024-11-11T20:30:02.370Z] [+2.25s] [INFO] package.json validated successfully
[2024-11-11T20:30:02.371Z] [+2.25s] [INFO] Completed operation: Validate package.json [SUCCESS]
------------------------------------------------------------

============================================================
[2024-11-11T20:30:02.375Z] [+2.25s] [INFO] Starting operation: Scan environment
============================================================

[2024-11-11T20:30:02.400Z] [+2.28s] [DEBUG] Detecting package manager
[2024-11-11T20:30:02.410Z] [+2.29s] [INFO] Package manager detected
  Data: {
    "packageManager": {
      "name": "npm",
      "version": "10.9.0"
    }
  }

[2024-11-11T20:30:02.555Z] [+2.43s] [INFO] Environment scan completed
  Data: {
    "packagesFound": 15,
    "warningsCount": 0
  }

[2024-11-11T20:30:02.560Z] [+2.44s] [INFO] Completed operation: Scan environment [SUCCESS]
------------------------------------------------------------

============================================================
[2024-11-11T20:30:05.100Z] [+4.98s] [INFO] Starting operation: Display report
============================================================

[2024-11-11T20:30:05.120Z] [+5.00s] [DEBUG] Displaying raw JSON content
[2024-11-11T20:30:05.150Z] [+5.03s] [INFO] Completed operation: Display report [SUCCESS]
------------------------------------------------------------

============================================================
[2024-11-11T20:30:05.160Z] [+5.04s] [INFO] Starting operation: Handle report submission
============================================================

[2024-11-11T20:30:06.200Z] [+6.08s] [INFO] User declined to submit report
[2024-11-11T20:30:06.205Z] [+6.08s] [INFO] Completed operation: Handle report submission [SUCCESS]
------------------------------------------------------------

============================================================
Finished at: 2024-11-11T20:30:08.495Z
Total elapsed time: 8.37s
============================================================
```

## Log Levels

The logger supports four log levels:

### INFO
General information about operations and their results. Examples:
- Operation completion status
- Counts of discovered files or packages
- Major milestones in execution

### WARN
Warnings about non-critical issues that don't stop execution. Examples:
- Multiple lockfiles detected
- Missing lockfile
- Truncated files
- Failed custom dependency discoveries

### ERROR
Errors that occurred during execution, with full stack traces. Examples:
- File read/write failures
- Invalid package.json
- Analysis failures
- Network errors

### DEBUG
Detailed debugging information for troubleshooting. Examples:
- Configuration details
- File paths being processed
- Intermediate operation states
- Internal decisions and logic flow

## Common Use Cases

### 1. Debugging Scan Issues

If the CLI is having trouble scanning dependencies:

```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log scan-debug.log
```

Check the log for:
- Which operations are taking too long
- Any warnings about failed dependency discoveries
- Errors from git clones or tarball downloads
- File paths that couldn't be read

### 2. Reporting Issues to Support

When reporting issues to NodeSource support:

```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log support-log.txt
```

Share the log file along with your issue report for faster troubleshooting.

### 3. Audit Trail

For compliance or audit purposes:

```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log audit-$(date +%Y%m%d).log
```

This creates a timestamped log file with complete execution details.

### 4. Performance Analysis

To understand which operations are slow:

```bash
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log perf.log
```

Look for elapsed times `[+X.XXs]` in the log entries to identify bottlenecks.

## Log File Location

The log file path can be:
- **Relative**: `--log ./logs/upgrade.log` (relative to current directory)
- **Absolute**: `--log /var/log/upgrade.log` (absolute path)

**Note**: The parent directory must exist. The CLI will fail if it cannot write to the specified location.

## What's Logged

The log file includes:

✅ **Logged Information:**
- Command-line flags used
- File paths being processed
- Operation timing and elapsed time
- Warnings and errors with stack traces
- Counts of discovered files, packages, etc.
- Configuration details (ESLint config, target version, etc.)
- Success/failure status of operations

❌ **NOT Logged:**
- Contents of package.json files
- Dependency versions or names
- Source code from your project
- Sensitive data or credentials

**Privacy Note**: File paths may reveal information about your project structure.

## Implementation Details

### Logger Module (`lib/logger.js`)

The logger is implemented as a class with the following key methods:

```javascript
logger.info(message, data)              // Log info message with optional data
logger.warn(message, data)              // Log warning message
logger.error(message, error)            // Log error with stack trace
logger.debug(message, data)             // Log debug information
logger.startOperation(operation)        // Mark operation start
logger.endOperation(operation, success) // Mark operation end
logger.close()                          // Write footer and close logger
```

**Features:**
- ISO 8601 timestamps for all entries
- Elapsed time tracking from CLI start
- Automatic JSON formatting of data objects
- Graceful error handling (won't crash CLI if write fails)
- No-op logger when logging is disabled

### Integration Points

The logger is passed to and used by:

1. **CLI** (`bin/cli.js`): Main execution flow, operation tracking
2. **Scanner** (`lib/scanner/index.js`): Environment detection and scanning
3. **Analyzer** (`lib/scanner/analyzer.js`): Static code analysis
4. **Output** (`lib/output/index.js`): Report generation
5. **Display** (`lib/display.js`): Report display operations
6. **Submit** (`lib/submit.js`): Report submission operations

All modules accept an optional `logger` parameter and default to a no-op logger when not provided, ensuring backward compatibility.

### Error Handling

- Invalid log file paths are handled gracefully
- Write errors display a warning but don't crash the CLI
- Logger automatically creates a no-op logger if path is null
- All errors are logged with full stack traces when possible

### Performance Impact

- **Enabled**: Minimal performance impact (synchronous file appends)
- **Disabled**: Zero performance impact (no-op logger)
- Log file is kept open during execution for efficiency

## Testing

Comprehensive test suite in `test/logger.test.js` covers:

- ✅ No-op logger creation and behavior
- ✅ Log file writing with all log levels
- ✅ Error handling for invalid paths
- ✅ Timestamp and elapsed time formatting
- ✅ Operation tracking (start/end)
- ✅ Data serialization

All tests pass successfully (71/71 tests in the full suite).

## Example Log Output

Here's what a typical log file looks like:

```
=== Node.js Upgrade Advisor Log ===
Started at: 2024-11-11T20:30:00.000Z

[2024-11-11T20:30:00.123Z] [+0.00s] [INFO] CLI started
  Data: {
    "flags": {
      "log": "./upgrade-log.txt",
      "exclude": []
    },
    "nodeVersion": "v22.11.0",
    "cwd": "/home/user/my-project"
  }

============================================================
[2024-11-11T20:30:00.150Z] [+0.03s] [INFO] Starting operation: Scan environment
============================================================

[2024-11-11T20:30:00.400Z] [+0.28s] [DEBUG] Detecting package manager
[2024-11-11T20:30:00.410Z] [+0.29s] [INFO] Package manager detected
  Data: {
    "packageManager": {
      "name": "npm",
      "version": "10.9.0"
    }
  }

[2024-11-11T20:30:00.415Z] [+0.29s] [DEBUG] Detecting lockfiles
[2024-11-11T20:30:00.425Z] [+0.30s] [INFO] Lockfiles detected
  Data: {
    "selected": "package-lock.json",
    "detected": [
      "package-lock.json"
    ]
  }

[2024-11-11T20:30:00.450Z] [+0.33s] [DEBUG] Scanning for CI/CD configs
[2024-11-11T20:30:00.550Z] [+0.43s] [INFO] CI/CD configs scan completed
  Data: {
    "count": 2
  }

[2024-11-11T20:30:00.555Z] [+0.43s] [INFO] Environment scan completed
  Data: {
    "packagesFound": 15,
    "warningsCount": 0
  }

[2024-11-11T20:30:00.560Z] [+0.44s] [INFO] Completed operation: Scan environment [SUCCESS]
------------------------------------------------------------

[2024-11-11T20:30:08.490Z] [+8.37s] [INFO] CLI completed successfully

============================================================
Finished at: 2024-11-11T20:30:08.495Z
Total elapsed time: 8.37s
============================================================
```

## Troubleshooting

### Log file not created

**Cause**: Parent directory doesn't exist or lacks write permissions

**Solution**: Ensure the directory exists and you have write permissions

```bash
# Create logs directory
mkdir -p ./logs

# Run with log in that directory
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log ./logs/upgrade.log
```

### Too much output

**Note**: Currently, all log levels are written when logging is enabled. Future versions may add a `--log-level` flag to control verbosity.

### Want to see logs in real-time

The log file is written as operations complete. You can tail it in another terminal:

```bash
# In terminal 1
npx -p node@latest -p @nodesource/upgrade nodesource-upgrade --log ./upgrade.log

# In terminal 2
tail -f ./upgrade.log
```

## Future Enhancements

Potential improvements for future versions:

1. **Log Rotation**: Implement log rotation for long-running operations
2. **Log Levels Control**: Add `--log-level` flag to control verbosity
3. **Structured Logging**: Add JSON output format option (`--log-format json`)
4. **Real-time Streaming**: Stream logs to stdout in addition to file
5. **Log Analysis Tools**: Create utility to analyze and summarize log files
6. **Colorized Output**: Add color-coded log levels when viewing in terminal

## Summary

The logging system provides comprehensive visibility into CLI operations without affecting existing functionality. It's designed to be:

- **Non-intrusive**: Fully optional, defaults to no-op
- **Comprehensive**: Logs all major operations with timing
- **Safe**: Graceful error handling, won't crash the CLI
- **Private**: Doesn't log sensitive data or file contents
- **Fast**: Minimal performance impact

Use `--log` whenever you need to debug issues, analyze performance, create audit trails, or report problems to support.
