import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";

// A connected /dev/battle?scenario=field-grouping Orca tab, with the main phase open.
// node tools/diagnostics/field-grouping-responsive.mjs <browserPageId> [--screenshots] [--output-dir=path]
// Screenshots require a visible tab; the harness never brings Orca to the foreground.
const page = process.argv[2];
if (!page) throw new Error("Pass the Orca page ID of the server-backed grouping scenario.");
function orca(args) {
  const response = JSON.parse(
    execFileSync("orca", [...args, "--page", page, "--json"], { encoding: "utf8", maxBuffer: 16e6 }),
  );
  if (!response.ok) throw new Error(JSON.stringify(response.error));
  return response.result;
}
function evaluate(fn) {
  return JSON.parse(orca(["eval", "--expression", `(${fn.toString()})().then(JSON.stringify)`]).result);
}
async function inspect() {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (location.pathname !== "/dev/battle" || new URLSearchParams(location.search).get("scenario") !== "field-grouping")
    throw new Error("Use the server-backed grouping scenario.");
  const failures = [];
  const check = (ok, description) => {
    if (!ok) failures.push(description);
  };
  check(document.documentElement.scrollWidth <= innerWidth, "Document overflows horizontally");
  const rows = [...document.querySelectorAll("[data-field-layout=organized]")];
  check(rows.length === 2, "Both connected battle rows must be present");
  const lanes = [];
  for (const row of rows) {
    const rowRect = row.getBoundingClientRect();
    check(rowRect.top >= 0 && rowRect.bottom <= innerHeight, "Battle row outside viewport");
    for (const lane of row.querySelectorAll(".game-battle-lane")) {
      const rect = lane.getBoundingClientRect();
      const cards = [...lane.querySelectorAll("[data-field-key]")];
      check(cards.length > 0, "Missing scenario cards");
      for (const card of cards) {
        const cardRect = card.getBoundingClientRect();
        check(
          cardRect.top >= rect.top - 1 && cardRect.bottom <= rect.bottom + 1,
          `Vertically clipped ${card.getAttribute("aria-label")}`,
        );
      }
      const previous = lane.scrollLeft;
      lane.scrollLeft = lane.scrollWidth;
      // Read after a full frame; scrolling may be smooth in the production styles.
      await new Promise((resolve) => setTimeout(resolve, 500));
      const last = cards.at(-1)?.getBoundingClientRect();
      check(last && last.left >= rect.left - 1 && last.right <= rect.right + 1, "Last card unreachable by lane scroll");
      lane.scrollLeft = previous;
      lanes.push({
        side: row.classList.contains("game-battle-row--you") ? "viewer" : "opponent",
        layout: row.dataset.lanes,
        cards: cards.length,
        scrolls: lane.scrollWidth > lane.clientWidth,
      });
    }
  }
  const watchmaker = document.querySelector('.game-battle-row--you [aria-label="Watchmaker"]');
  check(Boolean(watchmaker), "Saved-source Watchmaker must stay separate");
  watchmaker?.click();
  await new Promise((resolve) => setTimeout(resolve, 800));
  const dialog = document.querySelector('.arena-permanent-inspector[role="dialog"]');
  check(
    Boolean(dialog?.querySelector('[aria-label="Abrir Shoutmon"], [aria-label="Open Shoutmon"]')),
    "Saved Shoutmon cannot be inspected",
  );
  let inspectionInFlight = false;
  if (dialog) {
    const rect = dialog.getBoundingClientRect();
    // This is a layout harness. The sheet enters from below the viewport; a
    // background Orca tab can retain that animation offset without painting.
    // Check its destination box and report the outstanding animation separately.
    const translation = getComputedStyle(dialog).translate.split(" ");
    const dx = Number.parseFloat(translation[0]) || 0;
    const dy = Number.parseFloat(translation[1]) || 0;
    inspectionInFlight = dialog
      .getAnimations()
      .some((animation) => animation.playState === "running" || animation.pending);
    check(
      rect.left - dx >= -1 &&
        rect.right - dx <= innerWidth + 1 &&
        rect.top - dy >= -1 &&
        rect.bottom - dy <= innerHeight + 1,
      "Card inspection outside viewport",
    );
    dialog.querySelector('[aria-label="Fechar"], [aria-label="Close"]')?.click();
  }
  return { width: innerWidth, height: innerHeight, lanes, inspectionInFlight, failures };
}

const outputArg = process.argv.find((arg) => arg.startsWith("--output-dir="));
const outputDir = resolvePath(outputArg?.slice("--output-dir=".length) ?? "/tmp");
if (process.argv.includes("--screenshots") || outputArg) mkdirSync(outputDir, { recursive: true });
const results = [];
for (const [width, height] of [
  [320, 640],
  [360, 740],
  [390, 844],
  [640, 360],
  [844, 320],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
]) {
  orca(["exec", "--command", `set viewport ${width} ${height}`]);
  const result = evaluate(inspect);
  results.push(result);
  if (process.argv.includes("--screenshots")) {
    const screenshot = orca(["screenshot"]);
    writeFileSync(
      join(outputDir, `field-grouping-live-${width}x${height}.png`),
      Buffer.from(screenshot.data, "base64"),
    );
  }
  console.log(JSON.stringify(result));
}
if (process.argv.includes("--screenshots") || outputArg) {
  writeFileSync(join(outputDir, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
  const figures = results
    .map(({ width, height, failures }) => {
      const filename = `field-grouping-live-${width}x${height}.png`;
      if (!existsSync(join(outputDir, filename))) return "";
      return `<figure><figcaption>${width} × ${height} · ${failures.length ? "Check failures" : "Layout passed"}</figcaption><a href="${filename}"><img src="${filename}" alt="Server-backed grouped battle at ${width} by ${height}" loading="lazy"></a></figure>`;
    })
    .join("\n");
  writeFileSync(
    join(outputDir, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Field grouping · Orca screenshots</title><style>body{margin:0;padding:24px;background:#111827;color:#e5e7eb;font:16px system-ui}h1{font-size:24px}p{max-width:75ch;color:#b7c3d6}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}figure{margin:0;padding:12px;background:#1e293b;border-radius:12px}figcaption{margin-bottom:12px}img{display:block;width:100%;height:auto;max-height:700px;object-fit:contain}a{color:#93c5fd}</style><h1>Field grouping after the pile-layout merge</h1><p>Orca Browser captures of the server-backed field-grouping scenario. Click a capture for its original resolution. Layout checks cover lane clipping, horizontal scrolling and saved-source inspection. Pending entrance animations in background tabs are recorded separately in <a href="results.json">results.json</a>.</p><div class="gallery">${figures}</div></html>`,
  );
}
orca(["exec", "--command", "set viewport 390 844"]);
if (results.some((result) => result.failures.length)) process.exitCode = 1;
