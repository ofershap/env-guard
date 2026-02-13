import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface EnvGuardOptions {
  envPath?: string;
  examplePath?: string;
  schemaPath?: string;
  cwd?: string;
}

interface ValidationError {
  key: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  missing: string[];
  extra: string[];
  errors: ValidationError[];
}

interface SchemaRule {
  required?: boolean;
  pattern?: string;
  enum?: string[];
}

type EnvSchema = Record<string, SchemaRule | boolean>;

function parseEnvFile(content: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars.set(key, value);
  }
  return vars;
}

function readFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

export function validateAgainstExample(
  envVars: Map<string, string>,
  exampleVars: Map<string, string>,
): ValidationResult {
  const missing: string[] = [];
  const extra: string[] = [];

  for (const key of exampleVars.keys()) {
    if (!envVars.has(key)) {
      missing.push(key);
    }
  }

  for (const key of envVars.keys()) {
    if (!exampleVars.has(key)) {
      extra.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    extra,
    errors: missing.map((key) => ({ key, message: "Missing variable" })),
  };
}

export function validateAgainstSchema(
  envVars: Map<string, string>,
  schema: EnvSchema,
): ValidationResult {
  const errors: ValidationError[] = [];
  const missing: string[] = [];
  const schemaKeys = new Set(Object.keys(schema));
  const extra: string[] = [];

  for (const [key, rule] of Object.entries(schema)) {
    const value = envVars.get(key);
    const isRequired =
      typeof rule === "boolean" ? rule : (rule.required ?? true);

    if (value === undefined || value === "") {
      if (isRequired) {
        missing.push(key);
        errors.push({ key, message: "Missing required variable" });
      }
      continue;
    }

    if (typeof rule === "object") {
      if (rule.pattern) {
        let regex: RegExp;
        try {
          regex = new RegExp(rule.pattern);
        } catch {
          errors.push({
            key,
            message: `Invalid pattern "${rule.pattern}"`,
          });
          continue;
        }
        if (!regex.test(value)) {
          errors.push({
            key,
            message: `Value "${value}" does not match pattern "${rule.pattern}"`,
          });
        }
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          key,
          message: `Value "${value}" is not one of: ${rule.enum.join(", ")}`,
        });
      }
    }
  }

  for (const key of envVars.keys()) {
    if (!schemaKeys.has(key)) {
      extra.push(key);
    }
  }

  return {
    valid: errors.length === 0,
    missing,
    extra,
    errors,
  };
}

export function envGuard(options: EnvGuardOptions = {}): ValidationResult {
  const cwd = options.cwd ?? process.cwd();
  const envPath = resolve(cwd, options.envPath ?? ".env");
  const examplePath = resolve(cwd, options.examplePath ?? ".env.example");
  const schemaPath = options.schemaPath
    ? resolve(cwd, options.schemaPath)
    : null;

  const envContent = readFile(envPath);
  if (envContent === null) {
    return {
      valid: false,
      missing: [],
      extra: [],
      errors: [{ key: "", message: `Cannot read ${envPath}` }],
    };
  }

  const envVars = parseEnvFile(envContent);

  if (schemaPath) {
    const schemaContent = readFile(schemaPath);
    if (schemaContent === null) {
      return {
        valid: false,
        missing: [],
        extra: [],
        errors: [{ key: "", message: `Cannot read schema ${schemaPath}` }],
      };
    }
    let schema: EnvSchema;
    try {
      schema = JSON.parse(schemaContent) as EnvSchema;
    } catch {
      return {
        valid: false,
        missing: [],
        extra: [],
        errors: [
          { key: "", message: `Cannot parse schema as JSON: ${schemaPath}` },
        ],
      };
    }
    return validateAgainstSchema(envVars, schema);
  }

  const exampleContent = readFile(examplePath);
  if (exampleContent === null) {
    return {
      valid: false,
      missing: [],
      extra: [],
      errors: [
        {
          key: "",
          message: `Cannot read ${examplePath}. Create a .env.example or use --schema.`,
        },
      ],
    };
  }

  const exampleVars = parseEnvFile(exampleContent);
  return validateAgainstExample(envVars, exampleVars);
}

export { parseEnvFile };
export type {
  EnvGuardOptions,
  ValidationResult,
  ValidationError,
  EnvSchema,
  SchemaRule,
};
