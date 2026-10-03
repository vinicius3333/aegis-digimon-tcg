import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Run after field-grouping-live.mjs, on the same actual server-backed match.
// node tools/diagnostics/arena-mobile.mjs <Orca page ID>
const page = process.argv[2];
if (!page) throw new Error("Provide an Orca browser page ID.");
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
async function inspect() {
  const paint = () =>
    new Promise((resolve) => {
      const timer = setTimeout(resolve, 50);
      requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  const tick = () =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(0);
    });
  const settle = async () => {
    window.dispatchEvent(new Event("resize"));
    for (let i = 0; i < 4; i++) await tick();
    await paint();
    await paint();
    for (const animation of document.getAnimations())
      if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
  };
  await settle();
  document
    .querySelector('.arena-permanent-inspector [aria-label="Fechar"], .arena-permanent-inspector [aria-label="Close"]')
    ?.click();
  await tick();
  const failures = [];
  const targets = [];
  const ownCards = [...document.querySelectorAll('.game-battle-row--you [data-field-key][role="button"]')];
  if (!ownCards.some((card) => card.getAttribute("aria-label")?.includes("Watchmaker")))
    throw new Error("Use the live field-grouping fixture, not a reconnected unrelated match.");
  for (const card of ownCards) {
    card.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
    await tick();
    await paint();
    await paint();
    const rect = card.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const label = card.getAttribute("aria-label");
    targets.push({
      label,
      width: rect.width,
      height: rect.height,
      reachable: hit?.closest("[data-field-key]") === card,
    });
    if (rect.width < 44 || rect.height < 44)
      failures.push({ kind: "small card target", label, width: rect.width, height: rect.height });
    if (hit?.closest("[data-field-key]") !== card)
      failures.push({ kind: "occluded card target", label, hit: hit?.className });
  }
  const saved = ownCards.find((card) => card.getAttribute("aria-label") === "Watchmaker");
  if (!saved) throw new Error("Saved-source Watchmaker was incorrectly grouped.");
  saved.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
  saved.click();
  await settle();
  const panel = document.querySelector('.arena-permanent-inspector[role="dialog"]');
  if (!panel) throw new Error("Card inspection failed to open.");
  const box = panel.getBoundingClientRect();
  if (box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1)
    failures.push({ kind: "inspector outside viewport" });
  const source = panel.querySelector('[aria-label="Abrir Shoutmon"], [aria-label="Open Shoutmon"]');
  if (!source) failures.push({ kind: "saved source missing" });
  const reading = panel.querySelector(".arena-permanent-inspector__effects");
  const readingSizes = [...panel.querySelectorAll(".arena-permanent-inspector__effect p")].map((p) =>
    parseFloat(getComputedStyle(p).fontSize),
  );
  if (readingSizes.some((size) => size < 12)) failures.push({ kind: "small inspection text", readingSizes });
  const close = panel.querySelector('[aria-label="Fechar"], [aria-label="Close"]');
  const closeBox = close.getBoundingClientRect();
  if (closeBox.width < 44 || closeBox.height < 44)
    failures.push({ kind: "small inspector close target", width: closeBox.width, height: closeBox.height });
  const sourceBox = source?.getBoundingClientRect();
  if (sourceBox && (sourceBox.width < 44 || sourceBox.height < 44))
    failures.push({ kind: "small source inspection target", width: sourceBox.width, height: sourceBox.height });
  const result = {
    width: innerWidth,
    height: innerHeight,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    targets,
    inspector: {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      readingSizes,
      savedSourceAvailable: !!source,
      scrollable: reading ? reading.scrollHeight > reading.clientHeight : null,
      closeTarget: [closeBox.width, closeBox.height],
      sourceTarget: sourceBox ? [sourceBox.width, sourceBox.height] : null,
    },
    failures,
  };
  close.click();
  await tick();
  return result;
}
const output = "apps/web/test-results/arena-interactions";
mkdirSync(output, { recursive: true });
const results = [];
for (const [width, height] of [
  [320, 640],
  [360, 740],
  [390, 844],
  [393, 852],
  [412, 915],
  [640, 360],
  [844, 320],
  [852, 393],
]) {
  orca(["exec", "--command", `set viewport ${width} ${height}`]);
  const result = JSON.parse(orca(["eval", "--expression", `(${inspect.toString()})().then(JSON.stringify)`]).result);
  if (result.width !== width || result.height !== height) throw new Error("Viewport changed during mobile checks.");
  results.push(result);
  writeFileSync(join(output, "mobile-targets.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ width, height, failures: result.failures }));
}
if (results.some((result) => result.failures.length)) process.exitCode = 1;
