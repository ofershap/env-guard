import { envGuard } from "./index.js";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

const envPath = getArg("env");
const examplePath = getArg("example");
const schemaPath = getArg("schema");

const result = envGuard({
  ...(envPath !== undefined && { envPath }),
  ...(examplePath !== undefined && { examplePath }),
  ...(schemaPath !== undefined && { schemaPath }),
});

if (result.valid) {
  console.log("\x1b[32m✓\x1b[0m All environment variables validated.");
  if (result.extra.length > 0) {
    console.log(
      `\x1b[33m!\x1b[0m Extra variables not in template: ${result.extra.join(", ")}`,
    );
  }
  process.exit(0);
} else {
  console.error("\x1b[31m✗\x1b[0m Environment validation failed:\n");
  for (const error of result.errors) {
    const prefix = error.key ? `  ${error.key}` : "  Error";
    console.error(`  \x1b[31m•\x1b[0m ${prefix}: ${error.message}`);
  }
  if (result.extra.length > 0) {
    console.log(
      `\n\x1b[33m!\x1b[0m Extra variables not in template: ${result.extra.join(", ")}`,
    );
  }
  process.exit(1);
}
