/**
 * `pnpm replay <command>`: fetch, extract, inspect and scaffold tests from match replays.
 * Argument parsing lives in `tools/args.ts` and every command in `tools/commands.ts`.
 *
 * Runs from source on the repository's test loader (`test-support/ts-loader.mjs`, legacy
 * decorators, `@aegis/shared` from its build), so build `@aegis/shared` first.
 */
import { parseReplayArgs, usageFor, UsageError } from "./tools/args.js";

// A headless tool: keep the logger from writing (or pruning) the API's log directory and from
// sending alerts. Unsupported card effects log and continue as they did on the production server
// that played the match, unless `--strict` asks for them to throw as in tests. Both are read when
// the engine is imported, which is why the commands are loaded dynamically below.
process.env.NODE_ENV = "test";
process.env.AEGIS_STRICT_EFFECTS = process.argv.includes("--strict") ? "1" : "0";
// The engine's own console chatter (e.g. `[WinCheck]`) goes to stderr: stdout carries only the
// command's output, so `--json` stays parseable.
console.log = console.info = console.debug = (...values: unknown[]) => console.error(...values);

async function main(): Promise<number> {
  let command;
  try {
    command = parseReplayArgs(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`${error.message}\n\n${usageFor(error.topic)}`);
    return 2;
  }
  const { runCommand } = await import("./tools/commands.js");
  try {
    return await runCommand(command, {
      out: (line) => process.stdout.write(line + "\n"),
      err: (line) => process.stderr.write(line + "\n"),
      env: process.env,
      // pnpm runs package scripts from the package directory; INIT_CWD is where the user ran it.
      cwd: process.env.INIT_CWD ?? process.cwd(),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

process.exitCode = await main();
