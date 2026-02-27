# Terms of Service

## Node.js Upgrade Advisor

### 1. Purpose

The Node.js Upgrade Advisor ("Tool") is designed to analyze your Node.js project environment and codebase to generate a discovery report. This report will be used by NodeSource to assess your project's upgrade readiness.

### 2. Data Collection

By using this Tool, you acknowledge that it will:

- Scan your project's package.json and lock files
- Analyze your JavaScript/TypeScript source code for deprecated Node.js APIs
- Detect your current Node.js version, package manager, and operating systems
- Identify CI/CD configurations and native module dependencies
- Generate a JSON file containing the collected information

### 3. Data Usage

The generated discovery report is saved locally to your machine. After generating the report:

- You will be shown the complete report content
- You will be **asked** if you want to submit the report to NodeSource for a free pre-update assessment
- Submission is **completely optional** and requires your explicit consent
- If you choose to submit, you will be asked for your name, email, and company name
- If you decline, the report remains saved locally only

You have full control over whether and when the report is shared with NodeSource.

### 4. Read-Only Operation

This Tool is **read-only**. It will:

- NOT modify any files in your project
- NOT install or update dependencies
- NOT store data locally beyond the generated JSON file
- NOT make network requests to upload data without your explicit consent
  - If you choose to submit the report, it will make a POST request to NodeSource's upgrade advisory service
  - This is completely optional and requires your explicit approval

### 5. Limitations

- Static analysis is limited to patterns detected by ESLint and eslint-plugin-n
- Analysis may timeout after 5 minutes on very large codebases
- Supports both JavaScript (.js, .mjs, .cjs) and TypeScript (.ts, .tsx, .mts, .cts) files

### 6. Acceptance

By proceeding, you accept these terms and acknowledge that:

- You understand the Tool's purpose and limitations
- You have the authority to run this Tool on your project
- You have the option to submit the report to NodeSource directly through the Tool
- You understand that report submission is optional and requires your explicit consent

---

**Last Updated:** 2025
