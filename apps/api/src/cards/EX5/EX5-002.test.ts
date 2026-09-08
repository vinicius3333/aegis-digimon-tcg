import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-002.js";
import "../index.js";

describe("EX5-002 Moonmon", () => {
  it("once per turn may digivolve itself when a Light Fang or Night Claw Tamer is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Light Fang"] }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              optional: true,
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("digivolves after a matching Tamer is played, but not after an unrelated Tamer", async () => {
    // A matching Tamer settles on the real digivolve milestone; an unrelated Tamer never
    // triggers Moonmon's inherited ability, so that case can only be proven by draining the
    // queue and asserting the digivolve did NOT happen (a disguised negative proof otherwise).
    const resolve = async (tamer: string, expectDigivolve: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-029", as: "host", under: ["EX5-002"] }],
            hand: [
              { card: tamer, as: "tamer" },
              { card: "BT1-032", as: "evolution" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({
        ok: true,
      });
      if (expectDigivolve) {
        await settle(() => s.perm("host").topCard?.cardId === "BT1-032", 300);
      } else {
        await drainMicrotasks(300);
      }
      return s.perm("host").topCard?.cardId === "BT1-032";
    };

    expect(await resolve("EX5-065", true)).toBe(true);
    expect(await resolve("BT1-087", false)).toBe(false);
  });
});
