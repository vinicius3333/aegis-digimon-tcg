import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

// Run on the server-backed /dev/arena?scenario=arena-field-grouping-dense.
const page = process.argv[2];
if (!page) throw new Error("Provide an Orca page ID.");
function orca(args) {
  const response = JSON.parse(
    execFileSync("orca", [...args, "--page", page, "--json"], { encoding: "utf8", maxBuffer: 4e6 }),
  );
  if (!response.ok) throw new Error(JSON.stringify(response.error));
  return response.result;
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
  const settle = async () => {
    window.dispatchEvent(new Event("resize"));
    for (let i = 0; i < 4; i++) await tick();
    for (const animation of document.getAnimations())
      if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
  };
  const close = () => document.querySelector(".arena-permanent-inspector__close")?.click();
  close();
  await settle();
  const failures = [];
  const targets = [];
  const cards = [...document.querySelectorAll(".game-battle-row--you [data-field-key]")];
  for (const name of ["Vulcanusmon", "Watchmaker"]) {
    const card = cards.find((candidate) => candidate.getAttribute("aria-label")?.startsWith(name));
    if (!card) throw new Error(`Missing real dense fixture: ${name}`);
    card.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
    card.click();
    await settle();
    const panel = document.querySelector(".arena-permanent-inspector");
    const sourceCount = panel.querySelectorAll('[data-role="stack"]').length;
    const linkedCount = panel.querySelectorAll('[data-role="linked"]').length;
    if (sourceCount !== (name === "Vulcanusmon" ? 12 : 8) || linkedCount !== (name === "Vulcanusmon" ? 2 : 0))
      failures.push({ name, kind: "missing source or link", sourceCount, linkedCount });
    const buttons = [...panel.querySelectorAll(".arena-permanent-inspector__source")];
    for (const button of buttons) {
      button.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      const rect = button.getBoundingClientRect();
      const reachable =
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("button") === button;
      const target = {
        name,
        label: button.getAttribute("aria-label"),
        width: rect.width,
        height: rect.height,
        reachable,
      };
      targets.push(target);
      if (!reachable || rect.width < 44 || rect.height < 44)
        failures.push({ kind: "inaccessible source or link", ...target });
    }
    const last = buttons.at(-1);
    last.click();
    await tick();
    const zoom = document.querySelector(".card-zoom");
    if (!zoom || !zoom.querySelector("img")) failures.push({ name, kind: "source zoom unavailable" });
    else zoom.click();
    await tick();
    close();
    await settle();
  }
  return { width: innerWidth, height: innerHeight, targets, failures };
}
const output = "apps/web/test-results/arena-interactions";
mkdirSync(output, { recursive: true });
const results = [];
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [640, 360],
  [844, 320],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
]) {
  orca(["exec", "--command", `set viewport ${width} ${height}`]);
  const result = JSON.parse(orca(["eval", "--expression", `(${inspect.toString()})().then(JSON.stringify)`]).result);
  if (result.width !== width || result.height !== height) throw new Error("Viewport changed during inspection");
  results.push(result);
  writeFileSync(`${output}/dense-inspection.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ width, height, targets: result.targets.length, failures: result.failures }));
}
if (results.some((result) => result.failures.length)) process.exitCode = 1;
