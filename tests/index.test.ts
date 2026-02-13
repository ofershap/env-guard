import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  envGuard,
  parseEnvFile,
  validateAgainstExample,
  validateAgainstSchema,
} from "../src/index.js";

describe("parseEnvFile", () => {
  it("parses key=value pairs", () => {
    const vars = parseEnvFile("FOO=bar\nBAZ=qux");
    expect(vars.get("FOO")).toBe("bar");
    expect(vars.get("BAZ")).toBe("qux");
  });

  it("ignores comments", () => {
    const vars = parseEnvFile("# comment\nFOO=bar");
    expect(vars.size).toBe(1);
    expect(vars.get("FOO")).toBe("bar");
  });

  it("ignores empty lines", () => {
    const vars = parseEnvFile("FOO=bar\n\n\nBAZ=qux");
    expect(vars.size).toBe(2);
  });

  it("handles double-quoted values", () => {
    const vars = parseEnvFile('FOO="bar baz"');
    expect(vars.get("FOO")).toBe("bar baz");
  });

  it("handles single-quoted values", () => {
    const vars = parseEnvFile("FOO='bar baz'");
    expect(vars.get("FOO")).toBe("bar baz");
  });

  it("handles empty values", () => {
    const vars = parseEnvFile("FOO=");
    expect(vars.get("FOO")).toBe("");
  });

  it("handles values with = sign", () => {
    const vars = parseEnvFile("URL=https://example.com?a=1&b=2");
    expect(vars.get("URL")).toBe("https://example.com?a=1&b=2");
  });

  it("trims whitespace around keys and values", () => {
    const vars = parseEnvFile("  FOO  =  bar  ");
    expect(vars.get("FOO")).toBe("bar");
  });
});

describe("validateAgainstExample", () => {
  it("returns valid when all keys present", () => {
    const env = new Map([
      ["A", "1"],
      ["B", "2"],
    ]);
    const example = new Map([
      ["A", ""],
      ["B", ""],
    ]);
    const result = validateAgainstExample(env, example);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("reports missing keys", () => {
    const env = new Map([["A", "1"]]);
    const example = new Map([
      ["A", ""],
      ["B", ""],
      ["C", ""],
    ]);
    const result = validateAgainstExample(env, example);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["B", "C"]);
  });

  it("reports extra keys", () => {
    const env = new Map([
      ["A", "1"],
      ["B", "2"],
      ["EXTRA", "3"],
    ]);
    const example = new Map([
      ["A", ""],
      ["B", ""],
    ]);
    const result = validateAgainstExample(env, example);
    expect(result.valid).toBe(true);
    expect(result.extra).toEqual(["EXTRA"]);
  });
});

describe("validateAgainstSchema", () => {
  it("validates required fields", () => {
    const env = new Map([["A", "1"]]);
    const schema = { A: true, B: true };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["B"]);
  });

  it("allows optional fields to be missing", () => {
    const env = new Map([["A", "1"]]);
    const schema = { A: true, B: false };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(true);
  });

  it("validates pattern", () => {
    const env = new Map([["PORT", "abc"]]);
    const schema = { PORT: { pattern: "^\\d+$" } };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0].key).toBe("PORT");
  });

  it("passes pattern validation", () => {
    const env = new Map([["PORT", "3000"]]);
    const schema = { PORT: { pattern: "^\\d+$" } };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(true);
  });

  it("validates enum", () => {
    const env = new Map([["NODE_ENV", "invalid"]]);
    const schema = {
      NODE_ENV: { enum: ["development", "production", "test"] },
    };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(false);
  });

  it("passes enum validation", () => {
    const env = new Map([["NODE_ENV", "production"]]);
    const schema = {
      NODE_ENV: { enum: ["development", "production", "test"] },
    };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(true);
  });

  it("treats empty string as missing for required", () => {
    const env = new Map([["A", ""]]);
    const schema = { A: { required: true } };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["A"]);
  });

  it("handles optional with rule object", () => {
    const env = new Map<string, string>();
    const schema = { A: { required: false } };
    const result = validateAgainstSchema(env, schema);
    expect(result.valid).toBe(true);
  });
});

describe("envGuard (integration)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "env-guard-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("validates .env against .env.example", () => {
    writeFileSync(join(dir, ".env"), "A=1\nB=2");
    writeFileSync(join(dir, ".env.example"), "A=\nB=\nC=");
    const result = envGuard({ cwd: dir });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["C"]);
  });

  it("returns valid when all keys match", () => {
    writeFileSync(join(dir, ".env"), "A=1\nB=2");
    writeFileSync(join(dir, ".env.example"), "A=\nB=");
    const result = envGuard({ cwd: dir });
    expect(result.valid).toBe(true);
  });

  it("validates against JSON schema", () => {
    writeFileSync(join(dir, ".env"), "PORT=abc\nNODE_ENV=dev");
    writeFileSync(
      join(dir, "schema.json"),
      JSON.stringify({
        PORT: { pattern: "^\\d+$" },
        NODE_ENV: { enum: ["development", "production", "test"] },
      }),
    );
    const result = envGuard({ cwd: dir, schemaPath: "schema.json" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it("reports error when .env is missing", () => {
    writeFileSync(join(dir, ".env.example"), "A=");
    const result = envGuard({ cwd: dir });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Cannot read");
  });

  it("reports error when .env.example is missing and no schema", () => {
    writeFileSync(join(dir, ".env"), "A=1");
    const result = envGuard({ cwd: dir });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Cannot read");
  });

  it("supports custom env and example paths", () => {
    writeFileSync(join(dir, ".env.local"), "A=1");
    writeFileSync(join(dir, ".env.template"), "A=\nB=");
    const result = envGuard({
      cwd: dir,
      envPath: ".env.local",
      examplePath: ".env.template",
    });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["B"]);
  });
});
