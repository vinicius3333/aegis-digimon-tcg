import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Isolated production-component probes, separate from normal-speed Arena captures.
 * These deliberately seek CSS clocks to check geometry at exact boundaries. */
export async function captureCombatLayout({ browser, base, output }) {
  await mkdir(output, { recursive: true });
  const results = [];
  for (const width of [320, 768, 1024, 1440]) {
    for (const reduced of [false, true]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(new URL("/dev/arena?mode=visual", base).href);
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        await page.evaluate(async () => {
          const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
          const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
          const { FieldClashGhosts } = await import("/src/game/screen/layout/FieldClashGhosts.tsx");
          const host = document.createElement("div");
          host.dataset.testid = "combat-layout-probe";
          Object.assign(host.style, {
            position: "fixed",
            left: "0",
            top: "0",
            width: "100%",
            height: "450px",
            zIndex: "1000",
          });
          host.style.setProperty("--t-card-shake", "250ms");
          host.style.setProperty("--t-claw-slash", "250ms");
          document.body.append(host);
          const loser = { permanentId: "isolated-loser", cardId: "BT1-010" };
          window.aegisCombatProbeRoot = createRoot(host);
          window.aegisCombatProbeRoot.render(
            createElement(FieldClashGhosts, {
              scene: {
                key: 1,
                attacker: loser,
                defender: { permanentId: "absent" },
                loserPermanentIds: [loser.permanentId],
                direction: "up",
              },
              permanentRefs: { current: {} },
              permanentCenters: { current: { [loser.permanentId]: { x: innerWidth / 2, y: 220 } } },
              permanentCardIds: { current: {} },
              combatImpactIds: new Set([loser.permanentId]),
            }),
          );
        });
        await page.locator('[data-testid="combat-layout-probe"] [data-combat-impact]').waitFor();
        await page.waitForFunction(() => {
          const art = document.querySelector('[data-testid="combat-layout-probe"] [data-combat-impact] img');
          return !art || (art.complete && art.naturalWidth > 0);
        });
        const samples = await page.evaluate((reduce) => {
          const ghost = document.querySelector('[data-testid="combat-layout-probe"] [data-combat-impact]');
          const art = [...ghost.children].find((child) => !child.matches(".game-claw"));
          const claw = ghost.querySelector(".game-claw");
          const svg = claw.querySelector("svg");
          const animations = ghost.getAnimations({ subtree: true });
          const artAnimation = art
            .getAnimations()
            .find((animation) => animation.animationName === "battle-card-impact");
          for (const animation of animations) animation.pause();
          return (reduce ? [0] : [0, 5, 15, 35, 65, 130, 187.5, 250, 350]).map((clock) => {
            for (const animation of animations)
              animation.currentTime = Math.min(clock, animation.effect.getComputedTiming().endTime);
            const style = getComputedStyle(art);
            const bounds = claw.getBoundingClientRect();
            const artBounds = art.getBoundingClientRect();
            const matrix = new DOMMatrix(getComputedStyle(svg).transform);
            const translation = style.translate.split(" ");
            function normalize(token, length) {
              if (!token || token === "none") return 0;
              return parseFloat(token) / (token.endsWith("%") ? 100 : length);
            }
            return {
              clock,
              artClock: artAnimation?.currentTime,
              artDuration: artAnimation?.effect.getComputedTiming().duration,
              x: normalize(translation[0], parseFloat(style.width)),
              y: normalize(translation[1], parseFloat(style.height)),
              width: artBounds.width,
              height: artBounds.height,
              clawX: bounds.x,
              clawY: bounds.y,
              clawDisplay: getComputedStyle(claw).display,
              clawProgressX: matrix.e / parseFloat(getComputedStyle(svg).width),
              clawProgressY: matrix.f / parseFloat(getComputedStyle(svg).height),
              animationCount: animations.length,
              rootTranslation: getComputedStyle(ghost).translate,
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          });
        }, reduced);
        await writeFile(
          path.join(output, `ghost-${width}${reduced ? "-reduced" : ""}.json`),
          JSON.stringify(samples, null, 2) + "\n",
        );
        if (
          samples.some(
            (sample) =>
              sample.overflow ||
              Math.abs(sample.width - 72) > 0.001 ||
              Math.abs(sample.height - 101) > 0.001 ||
              sample.rootTranslation !== "none",
          )
        )
          throw new Error(`${width}px: ghost changed resting geometry or page width`);
        if (reduced) {
          if (samples.some((sample) => sample.animationCount || sample.x || sample.y || sample.clawDisplay !== "none"))
            throw new Error(`${width}px: reduced ghost retained decorative motion`);
        } else {
          for (const sample of samples) {
            if (sample.artDuration !== 250 || sample.artClock !== Math.min(sample.clock, 250))
              throw new Error(`${width}px: ghost lost its independent 250 ms art clock`);
            if (sample.clawX !== samples[0].clawX || sample.clawY !== samples[0].clawY)
              throw new Error(`${width}px: ghost claw anchor moved`);
            const expected = -1 + Math.min(1, sample.clock / 250) ** 3;
            if (
              Math.abs(sample.clawProgressX - expected) > 0.00001 ||
              Math.abs(sample.clawProgressY - expected) > 0.00001
            )
              throw new Error(`${width}px: ghost claw trajectory changed with the tremor`);
          }
          if (
            Math.max(...samples.map((sample) => Math.abs(sample.x))) < 0.01 ||
            samples.slice(-2).some((sample) => sample.x || sample.y)
          )
            throw new Error(`${width}px: ghost artwork did not tremble then settle`);
          await page.evaluate(() => {
            for (const animation of document
              .querySelector('[data-testid="combat-layout-probe"]')
              .getAnimations({ subtree: true }))
              animation.currentTime = 130;
          });
        }
        await page.screenshot({ path: path.join(output, `ghost-${width}${reduced ? "-reduced" : ""}.png`) });
        if (errors.length) throw new Error(errors.join("\n"));
        results.push({ width, reduced, samples });
        console.log(`${width}px ${reduced ? "reduced" : "normal"}: production ghost geometry passed`);
      } finally {
        await page.close();
      }
    }
  }
  await writeFile(
    path.join(output, "probes.json"),
    JSON.stringify(
      {
        note: "Isolated FieldClashGhosts component; CSS clocks are deliberately sought. This is not a normal-speed engine or Arena playback recording.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
