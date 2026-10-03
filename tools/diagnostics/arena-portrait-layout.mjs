import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

// Actual dense server fixture: both fields and memory must stay visible without
// vertical scrolling. Only overflowing card lanes page horizontally.
const page = process.argv[2];
if (!page) throw new Error("Provide an Orca page ID.");
function orca(args) {
  const response = JSON.parse(
    execFileSync("orca", [...args, "--page", page, "--json"], { encoding: "utf8", maxBuffer: 32e6 }),
  );
  if (!response.ok) throw new Error(JSON.stringify(response.error));
  return response.result;
}
async function inspect(side) {
  const paint = () =>
    new Promise((resolve) => {
      const timer = setTimeout(resolve, 100);
      requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  const settle = async () => {
    window.dispatchEvent(new Event("resize"));
    await paint();
    await paint();
    for (const animation of document.getAnimations())
      if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
    await paint();
    await paint();
  };
  await settle();
  const field = document.querySelector(".game-battle-zones");
  const row = document.querySelector(`.game-battle-row--${side}[data-field-layout="organized"]`);
  const failures = [];
  const targets = [];
  const fieldBounds = field.getBoundingClientRect();
  if (field.scrollHeight > field.clientHeight + 1 || field.scrollTop !== 0)
    failures.push({ kind: "arena scrolls vertically", height: field.clientHeight, content: field.scrollHeight });
  for (const child of field.children) {
    const rect = child.getBoundingClientRect();
    if (rect.top < fieldBounds.top - 1 || rect.bottom > fieldBounds.bottom + 1)
      failures.push({ kind: "field or memory outside arena", part: child.className });
  }
  if (!row || !document.querySelector('.game-card-enter > [title="Vulcanusmon"]'))
    throw new Error("Use the real dense grouping fixture.");
  for (const lane of row.querySelectorAll(".game-battle-lane")) {
    const cards = [...lane.querySelectorAll("[data-field-key]")];
    for (const card of cards) {
      const cardBounds = card.getBoundingClientRect();
      const laneBounds = lane.getBoundingClientRect();
      lane.scrollBy({
        left: cardBounds.left + cardBounds.width / 2 - laneBounds.left - laneBounds.width / 2,
        behavior: "instant",
      });
      await settle();
      const rect = card.getBoundingClientRect();
      const bounds = field.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const reachable = hit?.closest("[data-field-key]") === card;
      targets.push({ name: card.getAttribute("aria-label"), reachable, width: rect.width, height: rect.height });
      if (!reachable || rect.top < bounds.top || rect.bottom > bounds.bottom)
        failures.push({ kind: "card outside visible field", name: card.getAttribute("aria-label") });
    }
    lane.scrollLeft = lane.scrollWidth;
    await settle();
    const bounds = field.getBoundingClientRect();
    for (const arrow of document.querySelectorAll(".game-battle-scroll-arrow")) {
      const rect = arrow.getBoundingClientRect();
      if (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)
        failures.push({ kind: "arrow outside visible field", label: arrow.getAttribute("aria-label") });
      if (
        document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest("button") !== arrow
      )
        failures.push({ kind: "arrow covered", label: arrow.getAttribute("aria-label") });
    }
    const arrow = [...document.querySelectorAll(".game-battle-scroll-arrow")].find((button) =>
      button.getAttribute("aria-label")?.startsWith(lane.getAttribute("aria-label")),
    );
    if (lane.scrollWidth > lane.clientWidth && !arrow) failures.push({ kind: "missing scroll control" });
  }
  // Show the deep stack and its badges at the end of the own Digimon lane.
  const deep = [...row.querySelectorAll("[data-field-key]")].find((card) =>
    card.getAttribute("aria-label")?.startsWith("Vulcanusmon"),
  );
  deep?.scrollIntoView({ block: "center", inline: "end", behavior: "instant" });
  await settle();
  return {
    side,
    width: innerWidth,
    height: innerHeight,
    fieldScrollHeight: field.scrollHeight,
    fieldHeight: field.clientHeight,
    targets,
    failures,
  };
}
const output = "apps/web/test-results/arena-interactions/portrait-no-scroll";
mkdirSync(output, { recursive: true });
const results = [];
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [412, 915],
]) {
  orca(["exec", "--command", `set viewport ${width} ${height}`]);
  for (const side of ["opp", "you"]) {
    const raw = orca([
      "eval",
      "--expression",
      `(${inspect.toString()})(${JSON.stringify(side)}).then(JSON.stringify)`,
    ]).result;
    const result = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (result.width !== width || result.height !== height)
      throw new Error("Viewport changed during portrait scrolling checks");
    // Let WKWebView return to its native input loop between geometry probes
    // and a scroll action; smooth scrolling need not advance within one eval.
    const action = orca([
      "eval",
      "--expression",
      `(()=>{
      const lane=document.querySelector('.game-battle-row--${side} .game-battle-lane--support');
      lane.scrollIntoView({block:'center',behavior:'instant'});
      const before=lane.scrollLeft;
      const arrow=[...document.querySelectorAll('.game-battle-scroll-arrow')].find(b=>b.getAttribute('aria-label')?.startsWith(lane.getAttribute('aria-label')));
      arrow?.click(); return JSON.stringify({before,label:lane.getAttribute('aria-label'),clicked:!!arrow});
    })()`,
    ]).result;
    const scroll = typeof action === "string" ? JSON.parse(action) : action;
    const rawMoved = orca([
      "eval",
      "--expression",
      `(async()=>{
      const lane=[...document.querySelectorAll('.game-battle-lane')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(scroll.label)});
      const start=performance.now();while(lane.scrollLeft===${scroll.before}&&performance.now()-start<2000)await new Promise(r=>setTimeout(r,50));
      return lane.scrollLeft!==${scroll.before};
    })()`,
    ]).result;
    const moved = typeof rawMoved === "string" ? JSON.parse(rawMoved) : rawMoved;
    if (scroll.clicked && !moved) result.failures.push({ kind: "scroll arrow did not move lane", ...scroll });
    results.push(result);
    try {
      writeFileSync(`${output}/${side}-${width}x${height}.png`, Buffer.from(orca(["screenshot"]).data, "base64"));
    } catch {
      result.screenshotUnavailable = true;
    }
    writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ side, width, height, targets: result.targets.length, failures: result.failures }));
  }
}
if (results.some((result) => result.failures.length)) process.exitCode = 1;
