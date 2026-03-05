---
name: env-validation
description: Validate .env files against .env.example or a JSON schema. Use when checking environment variables before deploy or debugging missing config.
---

# Environment Variable Validation

Use this skill to validate `.env` files against `.env.example` or a JSON schema. Catches missing, extra, or invalid environment variables before your app does.

## Usage

```bash
# Zero config — checks .env against .env.example
npx env-guard

# Custom paths
npx env-guard --env .env.production --example .env.example

# JSON schema validation
npx env-guard --schema env-schema.json
```

## As a Library

```typescript
import { validate } from "env-guard";

const result = validate({
  env: ".env",
  example: ".env.example",
});

if (!result.valid) {
  console.error(result.errors);
  process.exit(1);
}
```

## Key Patterns

- Zero config by default — compares `.env` against `.env.example` in the current directory
- JSON schema mode validates types, patterns, and required fields
- Returns structured errors: missing variables, extra variables, type mismatches
- Zero dependencies — no supply chain risk
- Exit code 1 on failure — safe to use in CI pipelines and pre-deploy hooks
