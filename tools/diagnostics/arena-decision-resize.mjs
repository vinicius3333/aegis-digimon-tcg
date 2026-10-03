import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

// Real Izzy reveal/target decision survives orientation and desktop resizing.
// node tools/diagnostics/arena-decision-resize.mjs <Orca page ID> [--prepared]
// --prepared uses an already selected, unconfirmed Agumon reveal in the live fixture.
const page = process.argv[2];
if (!page) throw new Error("Provide an Orca page ID.");
function orca(args) {
  let response;
  try {
    response = JSON.parse(
      execFileSync("orca", [...args, "--page", page, "--json"], { encoding: "utf8", maxBuffer: 4e6 }),
    );
  } catch (error) {
    if (!error.stdout) throw error;
    response = JSON.parse(error.stdout);
  }
  if (!response.ok) throw new Error(JSON.stringify(response.error));
  return response.result;
}
function evaluate(fn) {
  return JSON.parse(orca(["eval", "--expression", `(${fn.toString()})().then(JSON.stringify)`]).result);
}
async function prepare() {
  const until = async (read) => {
    if (read()) return read();
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const result = read();
        if (result) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(result);
        }
      });
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("Decision preparation timed out"));
      }, 15000);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  };
  (
    await until(() =>
      [...document.querySelectorAll(".game-battle-row--you [data-field-key]")].find(
        (card) => card.getAttribute("aria-label") === "Izzy Izumi" && !card.hasAttribute("data-suspended"),
      ),
    )
  ).click();
  (
    await until(() =>
      [...document.querySelectorAll(".arena-permanent-inspector button")].find(
        (button) =>
          /^(Ativar efeito|Activate effect)/.test(button.getAttribute("aria-label") ?? "") && !button.disabled,
      ),
    )
  ).click();
  (await until(() => document.querySelector('[role="dialog"] button img[alt="Agumon"]')?.closest("button"))).click();
  await until(() => document.querySelector('.decision-overlay__candidate[aria-pressed="true"]'));
  return { prepared: true };
}
async function inspect() {
  const tick = () =>
    new Promise((resolve) => {
      const c = new MessageChannel();
      c.port1.onmessage = () => {
        c.port1.close();
        c.port2.close();
        resolve();
      };
      c.port2.postMessage(0);
    });
  window.dispatchEvent(new Event("resize"));
  for (let i = 0; i < 4; i++) await tick();
  for (const animation of document.getAnimations())
    if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
  const failures = [];
  const panel = document.querySelector(
    '.decision-overlay[role="dialog"], [role="dialog"]:has(.decision-overlay__candidate)',
  );
  if (!panel) throw new Error("Server target decision disappeared on resize.");
  const selected = panel.querySelector('.decision-overlay__candidate[aria-pressed="true"]');
  if (selected?.querySelector("img")?.alt !== "Agumon") failures.push("Selected Agumon did not survive resize");
  const confirmButton = [...panel.querySelectorAll("button")].find((button) =>
    /^Confirmar alvos$|^Confirm targets$/i.test(button.textContent),
  );
  if (!confirmButton || confirmButton.disabled) failures.push("Cannot confirm preserved selection");
  const controls = [];
  for (const button of [selected, confirmButton].filter(Boolean)) {
    button.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    await tick();
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const reachable = hit?.closest("button") === button;
    controls.push({
      label: button.getAttribute("aria-label") ?? button.textContent,
      width: rect.width,
      height: rect.height,
      reachable,
      hit: hit?.className,
    });
    if (!reachable) failures.push("Decision control unreachable after resize");
    if (rect.width < 44 || rect.height < 44) failures.push("Small decision target");
  }
  const box = panel.getBoundingClientRect();
  if (box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1)
    failures.push("Dialog outside viewport");
  return {
    width: innerWidth,
    height: innerHeight,
    selected: selected?.getAttribute("aria-label"),
    controls,
    failures,
    hand: document.querySelectorAll('[data-testid="hand"] .game-hand-card').length,
  };
}
if (!process.argv.includes("--prepared")) {
  orca(["goto", "--url", "http://localhost:5183/dev/battle?scenario=field-grouping"]);
  execFileSync(process.execPath, ["tools/diagnostics/field-grouping-live.mjs", page, "390", "844"], {
    stdio: "inherit",
  });
  evaluate(prepare);
}
if (process.argv.includes("--prepare-only")) process.exit(0);
const results = [];
for (const [width, height] of [
  [390, 844],
  [844, 390],
  [844, 320],
  [320, 640],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [390, 844],
]) {
  orca(["exec", "--command", `set viewport ${width} ${height}`]);
  const result = evaluate(inspect);
  if (result.width !== width || result.height !== height) throw new Error("Requested viewport was not applied");
  results.push(result);
  console.log(JSON.stringify(result));
}
async function confirm() {
  const before = document.querySelectorAll('[data-testid="hand"] .game-hand-card').length;
  [...document.querySelectorAll('[role="dialog"] button')]
    .find((button) => /^Confirmar alvos$|^Confirm targets$/i.test(button.textContent))
    .click();
  await new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (
        document.querySelectorAll('[data-testid="hand"] .game-hand-card').length === before + 1 &&
        !document.querySelector(".decision-overlay__candidate")
      ) {
        observer.disconnect();
        clearTimeout(timer);
        resolve();
      }
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error("Server did not resolve preserved target"));
    }, 15000);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  });
  return {
    handBefore: before,
    handAfter: document.querySelectorAll('[data-testid="hand"] .game-hand-card').length,
    serverResolved: true,
  };
}
const resolved = evaluate(confirm);
mkdirSync("apps/web/test-results/arena-interactions", { recursive: true });
writeFileSync(
  "apps/web/test-results/arena-interactions/decision-resize.json",
  JSON.stringify({ results, resolved }, null, 2),
);
if (results.some((result) => result.failures.length)) process.exitCode = 1;
