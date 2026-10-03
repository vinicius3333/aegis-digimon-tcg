import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve as resolvePath, join } from "node:path";

// Uses only the running app and Orca's embedded browser. No fabricated DOM/cards.
// node tools/diagnostics/arena-layout.mjs <page> --keywords [--scenario=substring] [--sizes=390x844,1440x900] [--output=directory] [--screenshots] [--select-hand]
// Hand-selection regression: --scenario=yoshino --sizes=844x320,390x844,1920x1080 --select-hand
const page = process.argv[2];
if (!page) throw new Error("Provide an Orca browser page ID.");
const arg = (name) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const output = resolvePath(arg("output") ?? "apps/web/test-results/arena-layout");
mkdirSync(output, { recursive: true });
function orca(args) {
  let response;
  try {
    response = JSON.parse(
      execFileSync("orca", [...args, "--page", page, "--json"], { encoding: "utf8", maxBuffer: 32e6 }),
    );
  } catch (error) {
    if (!error.stdout) throw error;
    // Orca emits structured errors even on nonzero exit. Keep evaluation source
    // out of diagnostics so the actual UI/transport failure remains readable.
    response = JSON.parse(error.stdout);
  }
  if (!response.ok) throw new Error(JSON.stringify(response.error));
  return response.result;
}
function evaluate(fn, value) {
  const result = orca([
    "eval",
    "--expression",
    `(async()=>{const ready=${ready.toString()};const inspect=${inspect.toString()};const tick=${tick.toString()};const waitForUi=${waitForUi.toString()};return (${fn.toString()})(${JSON.stringify(value)});})().then(JSON.stringify)`,
  ]).result;
  return typeof result === "string" ? JSON.parse(result) : result;
}
async function tick() {
  await new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(0);
  });
}
async function waitForUi(predicate) {
  if (predicate()) return;
  await new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (predicate()) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve();
      }
    });
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error("UI transition did not complete"));
    }, 15000);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  });
}
async function prepareKeywords() {
  document.querySelector('[aria-label="Ferramentas da demo"], [aria-label="Demo tools"]').click();
  await tick();
  [...document.querySelectorAll('[role="menuitem"]')]
    .find((button) => /Reproduzir keywords automaticamente|Automatically preview keywords/.test(button.textContent))
    .click();
  await tick();
  const player = document.querySelector(".arena-visual-player");
  if (player.dataset.demoPlaying === "true") player.querySelector(".arena-visual-player__button--play").click();
  player.querySelector(".arena-visual-player__summary").click();
  await tick();
  return [...player.querySelectorAll("select option")].map((option) => option.value);
}
async function keywordBatch(indices) {
  const batchResults = [];
  for (const index of indices) {
    const player = document.querySelector(".arena-visual-player");
    if (!player.querySelector("select")) {
      player.querySelector(".arena-visual-player__summary").click();
      await tick();
    }
    const select = player.querySelector("select");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, index);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    await ready();
    const result = await inspect(false);
    batchResults.push({
      scenario: `keyword-${player.dataset.demoKeyword}`,
      stage: player.dataset.demoStage,
      ...result,
    });
  }
  return batchResults;
}
async function ready() {
  const start = Date.now();
  while (!document.querySelector(".game-board")) {
    if (Date.now() - start > 15000) throw new Error(`Board failed to load: ${document.body.innerText.slice(-800)}`);
    await new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (document.querySelector(".game-board")) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 15000);
    });
  }
  await waitForUi(() => !document.querySelector(".waiting-dialog"));
  return [...document.querySelectorAll("select option")].map((option) => ({
    value: option.value,
    name: option.textContent,
  }));
}
async function inspect(settle = true) {
  // CDP viewport changes in an embedded background tab can delay the native
  // resize event until paint. Deliver the same UI event before measuring it.
  window.dispatchEvent(new Event("resize"));
  if (settle) {
    for (let frame = 0; frame < 4; frame++) await tick();
  } else
    await new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(0);
    });
  // Complete entrance/resize presentation before checking destination geometry.
  // Infinite decorative effects and the actual match/visual playback clock are untouched.
  for (const animation of document.querySelector(".game-board").getAnimations({ subtree: true })) {
    if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
  }
  const failures = [];
  const lanes = [];
  if (document.documentElement.scrollWidth > innerWidth + 1) failures.push({ kind: "document overflow" });
  if (innerWidth < 600 && innerHeight > innerWidth) {
    for (const row of document.querySelectorAll('.game-battle-row[data-field-layout="organized"]')) {
      const digimon = row.querySelector(".game-battle-lane--digimon");
      const support = row.querySelector(".game-battle-lane--support");
      if (digimon && support && support.getBoundingClientRect().top < digimon.getBoundingClientRect().bottom - 1)
        failures.push({ kind: "portrait support must be below Digimon" });
    }
  }
  for (const lane of document.querySelectorAll(".game-battle-lane")) {
    const box = lane.getBoundingClientRect();
    const cards = [...lane.querySelectorAll("[data-field-key]")];
    const style = getComputedStyle(lane);
    let previousFootprint;
    for (const card of cards) {
      if (getComputedStyle(card).visibility === "hidden") continue;
      const art = card.querySelector(".game-card-enter > [data-state]");
      const portraitPhone = innerWidth < 600 && innerHeight > innerWidth;
      const artFloor = portraitPhone ? (lane.classList.contains("game-battle-lane--support") ? 54 : 72) : 20;
      const footprint = [
        art,
        ...[...card.children].filter((part) => !part.className && part.style.position === "absolute"),
      ]
        .filter(Boolean)
        .map((part) => part.getBoundingClientRect());
      const left = Math.min(...footprint.map((rect) => rect.left));
      const right = Math.max(...footprint.map((rect) => rect.right));
      if (previousFootprint && left < previousFootprint.right + 3)
        failures.push({
          kind: "adjacent source or link overlap",
          card: card.getAttribute("aria-label"),
          gap: left - previousFootprint.right,
        });
      previousFootprint = { right };
      for (const badge of card.querySelectorAll(".game-keyword-badge")) {
        if (badge.scrollWidth > badge.clientWidth + 1)
          failures.push({ kind: "truncated keyword badge", label: badge.textContent });
      }
      if (art && parseFloat(getComputedStyle(art).width) < artFloor)
        failures.push({
          kind: "art too small",
          card: card.getAttribute("aria-label"),
          width: getComputedStyle(art).width,
        });
      // Include the sources and badges that extend outside the top card's layout box.
      const painted = [card, ...card.children].filter((element) => getComputedStyle(element).display !== "none");
      for (const element of painted) {
        const rect = element.getBoundingClientRect();
        if (rect.top < box.top - 1 || rect.bottom > box.bottom + 1)
          failures.push({
            kind: "vertical clipping",
            card: card.getAttribute("aria-label"),
            part: element.className || "source stack",
            top: +(box.top - rect.top).toFixed(1),
            bottom: +(rect.bottom - box.bottom).toFixed(1),
          });
      }
    }
    const previous = lane.scrollLeft;
    const last = cards.at(-1);
    const first = cards[0];
    for (const [edge, card] of [
      ["start", first],
      ["end", last],
    ]) {
      lane.scrollTo({ left: edge === "start" ? 0 : lane.scrollWidth, behavior: "instant" });
      if (!card) continue;
      for (const element of [card, ...card.children]) {
        const rect = element.getBoundingClientRect();
        if (rect.width && (edge === "start" ? rect.left < box.left - 1 : rect.right > box.right + 1))
          failures.push({
            kind: "unreachable horizontal edge",
            edge,
            card: card.getAttribute("aria-label"),
            part: element.className || "source stack",
          });
      }
    }
    lane.scrollTo({ left: previous, behavior: "instant" });
    lanes.push({
      cards: cards.length,
      height: box.height,
      width: box.width,
      scrolls: lane.scrollWidth > lane.clientWidth,
      padding: [style.paddingTop, style.paddingBottom],
    });
  }
  if (!lanes.length) failures.push({ kind: "missing organized lanes" });
  if (innerWidth < 600 && innerHeight > innerWidth) {
    const field = document.querySelector(".game-field");
    const fieldStyle = getComputedStyle(field);
    const utilityHeight = parseFloat(fieldStyle.getPropertyValue("--arena-utility-height"));
    const tracks = fieldStyle.gridTemplateRows.split(" ").map(parseFloat);
    const top = field.getBoundingClientRect().top + parseFloat(fieldStyle.paddingTop) - field.scrollTop;
    const gap = parseFloat(fieldStyle.rowGap);
    const ownTop = top + tracks.slice(0, -1).reduce((total, height) => total + height, 0) + gap * (tracks.length - 1);
    for (const utility of field.querySelectorAll(".game-utility-slot")) {
      const upper = utility.className.includes("--opp-") ? top : ownTop;
      for (const part of utility.querySelectorAll(
        ".game-pile, .game-breeding-slot__box, .game-breeding-slot__box .game-permanent > *",
      )) {
        const rect = part.getBoundingClientRect();
        if (rect.top < upper - 1 || rect.bottom > upper + utilityHeight + 1)
          failures.push({ kind: "utility artwork outside row", utility: utility.className, part: part.className });
        if (part.classList.contains("game-pile") && rect.width < 44)
          failures.push({ kind: "utility pile too small", utility: utility.className, width: rect.width });
      }
    }
  }
  return { width: innerWidth, height: innerHeight, lanes, failures };
}
const base = "http://localhost:5183/dev/arena";
orca(["goto", "--url", base]);
const options = evaluate(ready);
const cases = options
  .filter((option) => option.value.startsWith("arena") || option.value === "counter-blast-dna")
  .map(({ value }) => ({ name: value, url: `${base}?scenario=${encodeURIComponent(value)}` }));
for (const scenario of ["default", "security", "crowded", "imperial", "rina"])
  cases.push({ name: `visual-${scenario}`, url: `${base}?mode=visual&scenario=${scenario}&hand=20&opponentHand=20` });
const sizes = (arg("sizes") ?? "320x640,390x844,640x360,844x320,844x390,768x1024,1024x768,1280x720,1440x900,1920x1080")
  .split(",")
  .map((size) => size.split("x").map(Number));
const results = [];
let keywordCount = 0;
function save(result) {
  results.push(result);
  if (process.argv.includes("--screenshots")) {
    evaluate(async () => {
      // WKWebView can report new geometry before it has redrawn the resized surface.
      for (let i = 0; i < 2; i++)
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 100);
          requestAnimationFrame(() => {
            clearTimeout(timer);
            resolve();
          });
        });
      return true;
    });
    for (let attempt = 0; attempt < 3; attempt++)
      try {
        writeFileSync(
          join(output, `${result.scenario}-${result.width}x${result.height}.png`),
          Buffer.from(orca(["screenshot"]).data, "base64"),
        );
        break;
      } catch {
        if (attempt === 2) result.screenshotUnavailable = true;
      }
  }
  writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
}
async function liveBatch({ scenarios, selectHand }) {
  const batchResults = [];
  for (const scenario of scenarios) {
    const select = document.querySelector(".aegis-arena-live-toolbar select");
    const old = document.querySelector(".game-board");
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, scenario.name);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const start = Date.now();
    while (document.querySelector(".game-board") === old) {
      if (Date.now() - start > 15000) throw new Error(`Scenario did not reset: ${scenario.name}`);
      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (!old.isConnected) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 15000);
      });
    }
    await ready();
    const result = { scenario: scenario.name, ...(await inspect(false)) };
    if (selectHand) {
      const button = (pattern) =>
        [...document.querySelectorAll("button")].find((item) => pattern.test(item.textContent));
      await waitForUi(() => {
        const control = button(/^Encerrar criação$|^End breeding$|^Encerrar fase$|^End phase$/i);
        return document.querySelector(".trigger-chooser__layout") || (control && !control.disabled);
      });
      const endBreeding = button(/^Encerrar criação$|^End breeding$/i);
      if (endBreeding) {
        endBreeding.click();
        await waitForUi(() => {
          const main = button(/^Encerrar fase$|^End phase$/i);
          return document.querySelector(".trigger-chooser__layout") || (main && !main.disabled);
        });
      }
      // Reach Main using the actual server-backed controls. Yoshino's optional
      // start-of-main effects must resolve before a hand card can be selected.
      if (document.querySelector(".trigger-chooser__layout")) {
        const decline = button(/^Não para todos$|^No to all$/i);
        if (!decline) throw new Error(`Cannot decline pending effects: ${scenario.name}`);
        decline.click();
        const orderAll = button(/^Selecionar todos, de cima para baixo$|^Select all, top to bottom$/i);
        if (orderAll) orderAll.click();
        else document.querySelector(".trigger-chooser__option").click();
        await tick();
        document.querySelector(".trigger-chooser__layout .aegis-button--primary").click();
        await waitForUi(() => !document.querySelector(".trigger-chooser__layout"));
      }
      await waitForUi(() => {
        const main = button(/^Encerrar fase$|^End phase$/i);
        return main && !main.disabled;
      });
      const hand = document.querySelector(".game-hand-card");
      if (!hand) throw new Error(`No hand card to select: ${scenario.name}`);
      hand.click();
      await tick();
      if (hand.getAttribute("aria-pressed") !== "true")
        throw new Error(`Hand selection did not activate: ${scenario.name}`);
      const selected = await inspect();
      result.handSelected = {
        ...selected,
        supportFrames: [...document.querySelectorAll(".game-battle-lane--support [data-field-key]")].map((card) => ({
          role: card.getAttribute("role"),
          height: card.getBoundingClientRect().height,
          minimum: getComputedStyle(card).minHeight,
        })),
      };
      result.failures.push(...selected.failures.map((failure) => ({ ...failure, state: "hand selected" })));
    }
    batchResults.push(result);
  }
  return batchResults;
}
const selected = cases.filter((item) => !arg("scenario") || item.name.includes(arg("scenario")));
for (const [width, height] of sizes) {
  orca(["goto", "--url", base]);
  evaluate(ready);
  orca(["exec", "--command", `set viewport ${width} ${height}`]);
  evaluate(inspect);
  const live = selected.filter((item) => !item.name.startsWith("visual-"));
  const batchSize = process.argv.includes("--screenshots") ? 1 : 32;
  for (let start = 0; start < live.length; start += batchSize) {
    let batch;
    for (let attempt = 0; attempt < 3; attempt++) {
      orca(["exec", "--command", `set viewport ${width} ${height}`]);
      batch = evaluate(liveBatch, {
        scenarios: live.slice(start, start + batchSize),
        selectHand: process.argv.includes("--select-hand"),
      });
      if (batch.every((result) => result.width === width && result.height === height)) break;
      if (attempt === 2) throw new Error(`Browser viewport changed repeatedly during ${width}x${height}`);
      console.log(JSON.stringify({ retry: "viewport changed", width, height }));
    }
    for (const result of batch) save(result);
    console.log(
      JSON.stringify({
        width,
        height,
        checked: Math.min(start + batchSize, live.length),
        total: live.length,
        failures: results.filter((r) => r.failures.length).length,
      }),
    );
  }
  for (const scenario of selected.filter((item) => item.name.startsWith("visual-"))) {
    orca(["goto", "--url", scenario.url]);
    evaluate(ready);
    orca(["exec", "--command", `set viewport ${width} ${height}`]);
    save({ scenario: scenario.name, ...evaluate(inspect) });
    if (process.argv.includes("--keywords") && scenario.name === "visual-default") {
      const indices = evaluate(prepareKeywords);
      keywordCount = indices.length;
      for (let start = 0; start < indices.length; start += batchSize) {
        for (const result of evaluate(keywordBatch, indices.slice(start, start + batchSize))) {
          if (result.width !== width || result.height !== height)
            throw new Error("Viewport changed during keyword playback");
          save(result);
        }
      }
    }
  }
}
writeFileSync(join(output, "results.json"), JSON.stringify(results, null, 2));
const expectedChecks = sizes.length * (selected.length + keywordCount);
const uniqueChecks = new Set(results.map((result) => `${result.scenario}:${result.width}x${result.height}`));
if (uniqueChecks.size !== expectedChecks || results.length !== expectedChecks)
  throw new Error(`Incomplete catalog coverage: ${uniqueChecks.size}/${expectedChecks}`);
const summary = {
  checks: results.length,
  scenarios: selected.length + keywordCount,
  failedChecks: results.filter((result) => result.failures.length).length,
  geometry: "Settled layout; finite presentation animations completed before measurement",
  screens: sizes.map(([width, height]) => ({
    width,
    height,
    checks: results.filter((result) => result.width === width && result.height === height).length,
    failedChecks: results.filter(
      (result) => result.width === width && result.height === height && result.failures.length,
    ).length,
  })),
};
writeFileSync(join(output, "summary.json"), JSON.stringify(summary, null, 2));
writeFileSync(
  join(output, "index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arena layout verification</title><style>body{background:#111827;color:#e5e7eb;font:16px system-ui;padding:24px}table{border-collapse:collapse}td,th{padding:10px 20px;text-align:left;border-bottom:1px solid #374151}a{color:#93c5fd}</style><h1>Arena layout verification</h1><p>${summary.checks} checks · ${summary.scenarios} scenarios · ${summary.failedChecks} failing checks</p><p>${summary.geometry}. Checks include source fans, linked cards, badges and reachable horizontal scroll edges.</p><table><thead><tr><th>Viewport</th><th>Checks</th><th>Failures</th></tr></thead><tbody>${summary.screens.map((screen) => `<tr><td>${screen.width} × ${screen.height}</td><td>${screen.checks}</td><td>${screen.failedChecks}</td></tr>`).join("")}</tbody></table><p><a href="results.json">Detailed results</a> · <a href="summary.json">Summary JSON</a></p></html>`,
);
console.log(
  JSON.stringify({ checks: results.length, failing: results.filter((r) => r.failures.length).length, output }),
);
if (results.some((result) => result.failures.length)) process.exitCode = 1;
