#!/usr/bin/env node
/**
 * Screenshots every section of the dev board showcase (/dev/board) through the
 * Orca embedded browser CLI, so a board styling change can be reviewed as images.
 *
 * Requires a running web dev server and the `orca` CLI. Override with:
 *   ORCA_BIN=/path/to/orca UI_REVIEW_URL=http://localhost:4173 node tools/ui-review.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORCA_BIN = process.env.ORCA_BIN ?? "orca";
const BASE_URL = (process.env.UI_REVIEW_URL ?? "http://localhost:5173").replace(/\/+$/, "");
const SHOWCASE_PATH = "/dev/board";
/** Room for the lazy chunk, card art and the scroll to settle before each capture. */
const SETTLE_MS = 600;
const OUTPUT_DIR = resolve(
  process.env.UI_REVIEW_OUT ?? join(dirname(fileURLToPath(import.meta.url)), "..", "ui-review"),
);

const SECTION_IDS = [
  "showcase-memory-gauge",
  "showcase-hand",
  "showcase-permanents",
  "showcase-breeding",
  "showcase-security",
  "showcase-turn-banner",
  "showcase-attack-arc",
  "showcase-dialogs",
];

function orca(args) {
  const stdout = execFileSync(ORCA_BIN, [...args, "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const payload = JSON.parse(stdout);
  if (payload.ok === false) throw new Error(payload.error?.message ?? stdout);
  return payload;
}

function ensureTab(url) {
  try {
    const tabs = orca(["tab", "list"]).result?.tabs ?? [];
    if (tabs.length > 0) return;
  } catch {
    // `tab list` fails when the browser has never been opened; creating one fixes it.
  }
  orca(["tab", "create", "--url", url]);
}

function captureSection(id) {
  orca(["goto", "--url", `${BASE_URL}${SHOWCASE_PATH}#${id}`]);
  orca(["wait", "--timeout", String(SETTLE_MS)]);
  // A hash navigation can land before the lazy page has mounted the anchor, and the
  // browser then keeps whatever scroll position the tab already had. Re-anchor once
  // the section exists so each capture frames its own section.
  orca(["eval", "--expression", `document.getElementById(${JSON.stringify(id)})?.scrollIntoView()`]);
  orca(["wait", "--timeout", String(SETTLE_MS)]);
  const data = orca(["screenshot", "--format", "png"]).result?.data;
  if (typeof data !== "string") throw new Error("screenshot returned no image data");
  const file = join(OUTPUT_DIR, `${id}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  return file;
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  try {
    ensureTab(`${BASE_URL}${SHOWCASE_PATH}`);
  } catch (error) {
    console.error(`orca is unavailable: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let failures = 0;
  for (const id of SECTION_IDS) {
    try {
      console.log(`wrote ${captureSection(id)}`);
    } catch (error) {
      failures += 1;
      console.error(`${id}: ${error.message}`);
    }
  }
  if (failures > 0) process.exitCode = 1;
}

main();
