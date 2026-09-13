import { mkdtempSync, utimesSync, writeFileSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { LocalLogWriter, pruneLogs } from "./localLogWriter.js";

describe("local application logs", () => {
  it("removes expired segments while preserving seven days and unrelated files", () => {
    const dir = mkdtempSync(join(tmpdir(), "aegis-logs-"));
    try {
      for (const name of [
        "api-2026-09-05-old.jsonl",
        "api-2026-09-06-kept.jsonl",
        "api-2026-09-12-current.jsonl",
        "notes.txt",
      ])
        writeFileSync(join(dir, name), "data");
      writeFileSync(join(dir, "api.log.1"), "legacy");
      utimesSync(join(dir, "api.log.1"), new Date("2026-09-01"), new Date("2026-09-01"));
      pruneLogs(dir, Date.parse("2026-09-12T12:00:00Z"));
      expect(readdirSync(dir).sort()).toEqual([
        "api-2026-09-06-kept.jsonl",
        "api-2026-09-12-current.jsonl",
        "notes.txt",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flushes every queued line across size rotations", async () => {
    const dir = mkdtempSync(join(tmpdir(), "aegis-logs-"));
    try {
      const writer = new LocalLogWriter(dir, 20);
      const lines = Array.from({ length: 100 }, (_, i) => JSON.stringify({ index: i }) + "\n");
      for (const line of lines) writer.write(line);
      await writer.close();
      const actual = readdirSync(dir)
        .flatMap((name) =>
          readFileSync(join(dir, name), "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line).index),
        )
        .sort((a, b) => a - b);
      expect(actual).toEqual(Array.from({ length: 100 }, (_, i) => i));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
