import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Production components with controlled clocks/layout, separate from Arena playback. */
export async function captureCombatHandoff({ browser, base, output }) {
  await mkdir(output, { recursive: true });
  const results = [];
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(new URL("/dev/arena?mode=visual", base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
      const arrows = await page.evaluate(async () => {
        const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
        const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
        const { AttackArrowLayer } = await import("/src/game/screen/layout/AttackArrowLayer.tsx");
        const { readAttackArrowClock } = await import("/src/game/attackArrowClock.ts");
        const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
        const host = document.createElement("div");
        Object.assign(host.style, { position: "fixed", inset: "0", pointerEvents: "none" });
        document.body.append(host);
        const root = createRoot(host);
        const key = "attack:41:probe-attacker";
        const rows = [];
        function geometry(clock, moved = false) {
          return {
            key,
            kind: "attack",
            sourcePermanentId: "probe-attacker",
            clock,
            from: { x: 40, y: 200 },
            to: [{ x: moved ? 220 : 180, y: 60 }],
          };
        }
        function render(clock, moved = false) {
          root.render(createElement(AttackArrowLayer, { preview: null, tracking: geometry(clock, moved) }));
        }
        function parts() {
          const svg = host.querySelector("svg");
          const shaft = svg.querySelector(".game-attack-arrow__reveal");
          const tip = svg.querySelector(".game-attack-arrow__tip");
          return { svg, shaft, tip, animation: shaft.getAnimations()[0] };
        }
        function pose({ shaft, tip }) {
          return { shaft: new DOMMatrix(getComputedStyle(shaft).transform).a, tip: getComputedStyle(tip).translate };
        }
        try {
          for (const [elapsedMs, rate] of [
            [200, 1],
            [380, 1],
            [200, 0.5],
            [200, 2],
          ]) {
            const clock = {
              key,
              elapsedMs,
              remainingMs: Math.max(0, 380 - elapsedMs),
              observedAtMs: performance.now() - 100,
              playbackRate: rate,
            };
            render(clock);
            await frame();
            await frame();
            const initial = parts();
            const delay = initial.animation.effect.getTiming().delay;
            if (
              -delay < elapsedMs + 100 * rate ||
              -delay > elapsedMs + (performance.now() - clock.observedAtMs) * rate + 0.001
            )
              throw new Error("Carried declaration lost its observed age on mount");
            // Compare a restored mount against an independent fresh production
            // arrow sought to the exact restored age, including its second sweep.
            for (const animation of initial.svg.getAnimations({ subtree: true })) {
              animation.pause();
              animation.currentTime = 0;
            }
            const restored = pose(initial);
            const controlHost = document.createElement("div");
            host.append(controlHost);
            const controlRoot = createRoot(controlHost);
            controlRoot.render(
              createElement(AttackArrowLayer, { preview: null, tracking: { ...geometry(undefined), key: "control" } }),
            );
            await frame();
            await frame();
            const controlSvg = controlHost.querySelector("svg");
            for (const animation of controlSvg.getAnimations({ subtree: true })) {
              animation.pause();
              animation.currentTime = -delay;
            }
            const control = pose({
              shaft: controlSvg.querySelector(".game-attack-arrow__reveal"),
              tip: controlSvg.querySelector(".game-attack-arrow__tip"),
            });
            if (Math.abs(restored.shaft - control.shaft) > 0.00001 || restored.tip !== control.tip)
              throw new Error("Carried arrow differs from the same age on the original CSS clock");
            controlRoot.unmount();
            controlHost.remove();
            render(clock, true);
            await frame();
            await frame();
            const updated = parts();
            if (
              updated.svg !== initial.svg ||
              updated.animation !== initial.animation ||
              updated.animation.effect.getTiming().delay !== delay
            )
              throw new Error("Endpoint movement restarted the declaration animation");
            root.render(createElement(AttackArrowLayer, { preview: null, tracking: null }));
            await frame();
            await frame();
            render(clock);
            await frame();
            await frame();
            const remounted = parts();
            const remountDelay = remounted.animation.effect.getTiming().delay;
            if (remounted.svg === initial.svg || remountDelay > delay || remountDelay > -elapsedMs)
              throw new Error("A remounted declaration replayed instead of continuing its age");
            if (elapsedMs === 380 && (pose(remounted).shaft !== 1 || pose(remounted).tip !== "0px"))
              throw new Error("Completed declaration became incomplete after remount");
            rows.push({
              elapsedMs,
              rate,
              delay,
              restored,
              control,
              remountDelay,
              key: remounted.svg.dataset.attackKey,
              source: remounted.svg.dataset.attackSource,
            });
            root.render(createElement(AttackArrowLayer, { preview: null, tracking: null }));
            await frame();
            await frame();
          }
          for (const rate of [0.5, 2]) {
            render(undefined);
            await frame();
            await frame();
            const { animation } = parts();
            animation.playbackRate = rate;
            animation.currentTime = 100;
            await frame();
            await frame();
            const first = readAttackArrowClock({ board: host, key, permanentId: "probe-attacker" });
            if (!first || Math.abs(first.elapsedMs - animation.currentTime) > 0.001 || first.playbackRate !== rate)
              throw new Error("Painted declaration reader used wall time instead of its local playback clock");
            animation.updatePlaybackRate(rate === 0.5 ? 2 : 0.5);
            await frame();
            await frame();
            const changed = readAttackArrowClock({ board: host, key, permanentId: "probe-attacker" });
            if (
              !changed ||
              Math.abs(changed.elapsedMs - animation.currentTime) > 0.001 ||
              changed.playbackRate === rate
            )
              throw new Error("Painted declaration reader lost local age when playback speed changed");
            rows.push({ rate, first, changed, cssLocalTime: animation.currentTime });
            root.render(createElement(AttackArrowLayer, { preview: null, tracking: null }));
            await frame();
            await frame();
          }
          return rows;
        } finally {
          root.unmount();
          host.remove();
        }
      });
      const mask = await page.evaluate(
        async (rate) => {
          const { createElement, useLayoutEffect, useRef } = (await import("/node_modules/.vite/deps/react.js"))
            .default;
          const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
          const { ClawSlash } = await import("/src/game/piece/ClawSlash.tsx");
          const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
          const host = document.createElement("div");
          document.body.append(host);
          const root = createRoot(host);
          let flight;
          function Field() {
            const ref = useRef(null);
            useLayoutEffect(() => {
              // Parent layout runs after the mask's child layout. Install the
              // same planar recipe as the grouped row after changing its slot.
              ref.current.style.left = "132px";
              ref.current.style.top = "174px";
              flight = ref.current.animate(
                [
                  { translate: "-32px -24px", rotate: "0deg" },
                  { translate: "0px 0px", rotate: "0deg" },
                ],
                { duration: 420, fill: "both", easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
              );
              flight.playbackRate = rate;
              return () => flight?.cancel();
            }, []);
            return createElement(
              "div",
              {
                ref,
                "data-field-key": "probe",
                style: {
                  position: "fixed",
                  left: "100px",
                  top: "150px",
                  width: "90px",
                  height: "126px",
                },
              },
              createElement(ClawSlash, { fixedFieldAnchor: true }),
            );
          }
          root.render(createElement(Field));
          await frame();
          await frame();
          const field = host.querySelector("[data-field-key]");
          const claw = field.querySelector(".game-claw");
          const svg = claw.querySelector("svg");
          const samples = [];
          let replaced = false;
          try {
            const start = performance.now();
            while (performance.now() - start < 650) {
              await frame();
              const bounds = claw.getBoundingClientRect();
              const fieldBounds = field.getBoundingClientRect();
              const animation = svg.getAnimations()[0];
              const matrix = new DOMMatrix(getComputedStyle(svg).transform);
              samples.push({
                elapsedMs: performance.now() - start,
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                fieldX: fieldBounds.x,
                fieldY: fieldBounds.y,
                clawClock: animation.currentTime,
                clawDelay: animation.effect.getTiming().delay,
                progressX: matrix.e / parseFloat(getComputedStyle(svg).width),
                counterCount: claw.getAnimations().length,
                replaced,
                counterRate: claw.getAnimations()[0]?.playbackRate,
                flight: {
                  type: flight.constructor.name,
                  start: flight.startTime,
                  rate: flight.playbackRate,
                  effectType: flight.effect.constructor.name,
                  frames: flight.effect.getKeyframes(),
                },
              });
              if (!replaced && performance.now() - start > 100) {
                const previous = field.getBoundingClientRect();
                flight.cancel();
                field.style.left = "158px";
                field.style.top = "190px";
                const destination = field.getBoundingClientRect();
                flight = field.animate(
                  [
                    { translate: `${previous.x - destination.x}px ${previous.y - destination.y}px`, rotate: "0deg" },
                    { translate: "0px 0px", rotate: "0deg" },
                  ],
                  { duration: 420, fill: "both", easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
                );
                flight.playbackRate = rate === 0.5 ? 2 : 0.5;
                replaced = true;
              }
            }
            if (
              samples.length < 25 ||
              !replaced ||
              !samples.some((sample) => sample.counterCount === 1) ||
              samples.every((sample) => Math.abs(sample.fieldX - samples[0].fieldX) < 10)
            )
              throw new Error("Mask probe did not exercise actual parent layout movement");
            for (const sample of samples) {
              if (
                Math.abs(sample.x - 100) > 0.25 ||
                Math.abs(sample.y - 150) > 0.25 ||
                Math.abs(sample.width - 90) > 0.0001 ||
                Math.abs(sample.height - 126) > 0.0001 ||
                sample.counterCount > 1
              )
                throw new Error(
                  `Field mask followed its parent's layout: ${JSON.stringify({ sample, first: samples.slice(0, 4), last: samples.at(-1) })}`,
                );
              if (sample.counterCount && sample.counterRate !== sample.flight.rate)
                throw new Error("Field mask counter lost the parent flight's playback speed");
              const age = Math.max(0, sample.clawClock - sample.clawDelay);
              const expected = -1 + Math.min(1, age / 250) ** 3;
              if (Math.abs(sample.progressX - expected) > 0.00001)
                throw new Error("Parent layout changed the independent claw trajectory");
            }
            return samples;
          } finally {
            root.unmount();
            host.remove();
          }
        },
        width === 320 ? 0.5 : 2,
      );
      if (errors.length) throw new Error(errors.join("\n"));
      results.push({ width, arrows, mask });
      console.log(`${width}px: carried arrow and replaced field-layout mask passed`);
    } finally {
      await page.close();
    }
  }
  await writeFile(
    path.join(output, "probes.json"),
    JSON.stringify(
      {
        note: "Isolated production AttackArrowLayer/ClawSlash probes. Arrow clocks are deliberately sought; parent layout is constructed and replaced. These are separate from normal Arena captures and primary video evidence.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
