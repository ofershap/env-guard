# env-guard — Validate Environment Variables Before Deploy

[![npm version](https://img.shields.io/npm/v/env-guard.svg)](https://www.npmjs.com/package/env-guard)
[![npm downloads](https://img.shields.io/npm/dm/env-guard.svg)](https://www.npmjs.com/package/env-guard)
[![CI](https://github.com/ofershap/env-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/env-guard/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://github.com/ofershap/env-guard)

Stop deploying with missing env vars. A zero-dependency CLI and library that validates `.env` files against `.env.example` or a JSON schema — one command catches them before your app does.

```bash
$ npx env-guard
✗ Environment validation failed:
  • DATABASE_URL: Missing variable
  • API_KEY: Missing variable
```

> Validate `.env` files against `.env.example` or a JSON schema. CLI + library. Zero dependencies.

![env-guard CLI demo — validating .env against .env.example and catching missing variables](assets/demo.gif)

## Quick Start

```bash
# Zero config — checks .env against .env.example
npx env-guard
```

```
✓ All environment variables validated.
```

or when variables are missing:

```
✗ Environment validation failed:

  • DATABASE_URL: Missing variable
  • API_KEY: Missing variable
```

## Install

```bash
npm install env-guard
```

## CLI Usage

```bash
# Default: validate .env against .env.example
npx env-guard

# Custom paths
npx env-guard --env .env.local --example .env.template

# Validate against a JSON schema
npx env-guard --schema env-schema.json
```

| Flag        | Description               | Default        |
| ----------- | ------------------------- | -------------- |
| `--env`     | Path to .env file         | `.env`         |
| `--example` | Path to .env.example file | `.env.example` |
| `--schema`  | Path to JSON schema file  | _(none)_       |

Exit code is `0` when valid, `1` when validation fails.

## Library Usage

```ts
import { envGuard } from "env-guard";

const result = envGuard();

if (!result.valid) {
  console.error("Missing:", result.missing);
  console.error("Errors:", result.errors);
  process.exit(1);
}
```

### With custom paths

```ts
const result = envGuard({
  envPath: ".env.local",
  examplePath: ".env.template",
});
```

### With JSON schema

```ts
const result = envGuard({
  schemaPath: "env-schema.json",
});
```

## JSON Schema Format

Create a JSON file where each key is an env variable name:

```json
{
  "PORT": { "required": true, "pattern": "^\\d+$" },
  "NODE_ENV": { "enum": ["development", "production", "test"] },
  "DEBUG": { "required": false },
  "API_KEY": true,
  "OPTIONAL_VAR": false
}
```

| Rule       | Type       | Description                                       |
| ---------- | ---------- | ------------------------------------------------- |
| `required` | `boolean`  | Whether the variable must exist (default: `true`) |
| `pattern`  | `string`   | Regex pattern the value must match                |
| `enum`     | `string[]` | Allowed values                                    |
| `true`     | —          | Shorthand for `{ required: true }`                |
| `false`    | —          | Shorthand for `{ required: false }`               |

## API

### `envGuard(options?): ValidationResult`

| Option        | Type     | Default          | Description          |
| ------------- | -------- | ---------------- | -------------------- |
| `envPath`     | `string` | `".env"`         | Path to .env file    |
| `examplePath` | `string` | `".env.example"` | Path to example file |
| `schemaPath`  | `string` | —                | Path to JSON schema  |
| `cwd`         | `string` | `process.cwd()`  | Working directory    |

### `ValidationResult`

```ts
interface ValidationResult {
  valid: boolean;
  missing: string[];
  extra: string[];
  errors: ValidationError[];
}
```

### `validateAgainstExample(envVars, exampleVars): ValidationResult`

Lower-level function for programmatic use with pre-parsed env maps.

### `validateAgainstSchema(envVars, schema): ValidationResult`

Lower-level function for programmatic use with a schema object.

### `parseEnvFile(content): Map<string, string>`

Parse a .env file string into a Map. Handles comments, quotes, empty lines.

## Author

[![Made by ofershap](https://gitshow.dev/api/card/ofershap)](https://gitshow.dev/ofershap)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ofershap)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat&logo=github&logoColor=white)](https://github.com/ofershap)

## License

[MIT](LICENSE) &copy; [Ofer Shapira](https://github.com/ofershap)
