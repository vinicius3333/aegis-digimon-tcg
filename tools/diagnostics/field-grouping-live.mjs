import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Exercise real player controls and authoritative server effects, against the bot.
// node tools/diagnostics/field-grouping-live.mjs <Orca page ID> [width height]
const page = process.argv[2];
if (!page) throw new Error("Pass an Orca /dev/battle?scenario=field-grouping page ID.");
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 900);
function orca(args) {
  const response = JSON.parse(
    execFileSync("orca", [...args, "--page", page, "--json"], { encoding: "utf8", maxBuffer: 2e6 }),
  );
  if (!response.ok) throw new Error(JSON.stringify(response.error));
  return response.result;
}
async function exercise() {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
  async function until(read, description) {
    const started = performance.now();
    while (performance.now() - started < 15000) {
      const value = read();
      if (value) return value;
      await pause();
    }
    throw new Error(`Timed out: ${description}`);
  }
  const ownCards = () => [...document.querySelectorAll(".game-battle-row--you [data-field-key]")];
  const handCount = () => document.querySelectorAll('[data-testid="hand"] .game-hand-card').length;
  const buttonByText = (pattern, container = document) =>
    [...container.querySelectorAll("button")].find((button) => pattern.test(button.textContent));
  const activate = () =>
    [...document.querySelectorAll(".arena-permanent-inspector button")].find((button) =>
      /^(Ativar efeito|Activate effect)/.test(button.getAttribute("aria-label") ?? ""),
    );
  const read = () => ({
    hand: handCount(),
    izzy: ownCards()
      .filter((card) => card.getAttribute("aria-label")?.startsWith("Izzy Izumi"))
      .map((card) => ({
        label: card.getAttribute("aria-label"),
        suspended: card.hasAttribute("data-suspended"),
        copies: Number(card.querySelector(".game-copies-badge")?.textContent.replace("×", "") ?? 1),
        key: card.dataset.fieldKey,
      })),
    memory: document.querySelector('[aria-label^="Memória:"], [aria-label^="Memory:"]')?.getAttribute("aria-label"),
    boosts: ownCards()
      .filter((card) => card.getAttribute("aria-label")?.startsWith("Red Memory Boost!"))
      .map((card) => card.getAttribute("aria-label")),
  });
  if (location.pathname !== "/dev/battle" || new URLSearchParams(location.search).get("scenario") !== "field-grouping")
    throw new Error("Use the server-backed field-grouping scenario.");
  // Reset through the actual match control, opening the portrait menu if needed.
  const menu = document.querySelector(".game-mobile-menu");
  if (menu) menu.open = true;
  (
    await until(
      () =>
        [...document.querySelectorAll("button")].find(
          (button) =>
            button.getAttribute("aria-label") === "Reset battle" || button.textContent.includes("Reset battle"),
        ),
      "reset control",
    )
  ).click();
  await until(
    () => ownCards().some((card) => /Izzy Izumi.*3 (cópias|copies)/.test(card.getAttribute("aria-label") ?? "")),
    "fresh three-copy Izzy group",
  );
  (
    await until(() => {
      const button = buttonByText(/ENCERRAR.*CRIAÇÃO|END.*BREEDING/i);
      return button && !button.disabled ? button : undefined;
    }, "breeding phase")
  ).click();
  await until(() => {
    const button = buttonByText(/ENCERRAR.*FASE|END.*PHASE/i);
    return button && !button.disabled ? button : undefined;
  }, "main phase");
  const initial = read();
  const stages = [initial];
  const animationSamples = [];
  const seen = new Set();
  const observer = new MutationObserver(() => {
    const sources = ownCards()
      .filter((card) => card.classList.contains("game-permanent--effect-source"))
      .map((card) => ({
        label: card.getAttribute("aria-label"),
        suspended: card.hasAttribute("data-suspended"),
        copies: Number(card.querySelector(".game-copies-badge")?.textContent.replace("×", "") ?? 1),
      }));
    const signature = JSON.stringify(sources);
    if (sources.length && !seen.has(signature)) {
      seen.add(signature);
      animationSamples.push(sources);
    }
  });
  observer.observe(document.querySelector(".game-battle-row--you"), {
    attributes: true,
    childList: true,
    subtree: true,
  });
  for (let index = 0; index < 2; index++) {
    (
      await until(
        () =>
          ownCards().find(
            (card) => card.getAttribute("aria-label")?.startsWith("Izzy Izumi") && !card.hasAttribute("data-suspended"),
          ),
        "available Izzy",
      )
    ).click();
    (
      await until(() => {
        const button = activate();
        return button && !button.disabled ? button : undefined;
      }, "Izzy activation")
    ).click();
    (
      await until(
        () =>
          [...document.querySelectorAll('[role="dialog"] button img[alt="Agumon"]')]
            .map((image) => image.closest("button"))
            .find((button) => button && !button.disabled),
        "revealed Agumon selection",
      )
    ).click();
    (
      await until(() => {
        const button = buttonByText(/CONFIRMAR ALVOS|CONFIRM TARGETS/i);
        return button && !button.disabled ? button : undefined;
      }, "confirm reveal target")
    ).click();
    await until(
      () => {
        const state = read();
        return (
          state.hand === initial.hand + index + 1 &&
          state.izzy.filter((card) => card.suspended).reduce((sum, card) => sum + card.copies, 0) === index + 1
        );
      },
      `server resolves Izzy ${index + 1}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    stages.push(read());
  }
  const final = read();
  if (
    final.izzy.length !== 2 ||
    !final.izzy.some((card) => card.suspended && card.copies === 2) ||
    !final.izzy.some((card) => !card.suspended && card.copies === 1)
  )
    throw new Error(`Expected two suspended copies and one available: ${JSON.stringify(final)}`);
  // Inspect the untouched third copy. Its real server action must still be offered.
  ownCards()
    .find((card) => card.getAttribute("aria-label")?.startsWith("Izzy Izumi") && !card.hasAttribute("data-suspended"))
    .click();
  await until(() => {
    const button = activate();
    return button && !button.disabled ? button : undefined;
  }, "third copy remains activatable");
  document
    .querySelector('.arena-permanent-inspector [aria-label="Fechar"], .arena-permanent-inspector [aria-label="Close"]')
    ?.click();
  ownCards()
    .find((card) => card.getAttribute("aria-label")?.startsWith("Red Memory Boost!"))
    .click();
  (
    await until(() => {
      const button = activate();
      return button && !button.disabled ? button : undefined;
    }, "Delay activation")
  ).click();
  await until(
    () => read().boosts.length === 1 && read().boosts[0] === "Red Memory Boost!" && /\+10/.test(read().memory ?? ""),
    "one Delay consumed and two memory gained",
  );
  observer.disconnect();
  if (!animationSamples.some((sample) => sample.some((source) => source.suspended && source.copies === 2)))
    throw new Error("The effect animation did not reach the two-copy suspended group.");
  return {
    animationSamples,
    width: innerWidth,
    height: innerHeight,
    stages,
    afterDelay: read(),
    remainingEffectAvailable: true,
    passed: true,
  };
}

orca(["exec", "--command", `set viewport ${width} ${height}`]);
const result = JSON.parse(orca(["eval", "--expression", `(${exercise.toString()})().then(JSON.stringify)`]).result);
const outputDir = "apps/web/test-results/field-grouping";
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, `live-actions-${width}x${height}.json`), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
