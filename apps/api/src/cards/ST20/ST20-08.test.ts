import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

function digivolve(s: ReturnType<typeof setupEngine>) {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("kabuterimon").instanceId,
    }),
  ).toEqual({ ok: true });
}

describe("ST20-08 Kabuterimon", () => {
  it("keeps the committed card contract and encodes the inclusive <=1 Tamer gate", () => {
    expect(getCardDefinition("ST20-08")?.effectText).toContain("1 or fewer Tamers");
    const compiled = runtimeCompiledCard("ST20-08");
    const effect = compiled?.effects.find((entry) => entry.trigger === "WhenDigivolving");
    const play = effect?.actions[0];
    expect(play?.kind).toBe("PlayWithoutCost");
    expect(play?.condition).toMatchObject({ kind: "permanentCount", op: "lte", value: 1 });
  });

  it.each([
    { label: "zero Tamers", tamers: [], shouldPlay: true },
    { label: "one Tamer", tamers: ["ST20-12"], shouldPlay: true },
    { label: "two Tamers", tamers: ["ST20-12", "ST20-13"], shouldPlay: false },
  ])("plays an ADVENTURE Tamer with $label only when the <=1 gate passes", async ({ tamers, shouldPlay }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-07", as: "base" },
            ...tamers.map((card, index) => ({ card, as: `tamer-${index}` })),
          ],
          hand: [
            { card: "ST20-08", as: "kabuterimon" },
            { card: "ST20-12", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    digivolve(s);
    await settle(() => s.perm("base").topCard?.cardId === "ST20-08");
    await settle(() => false, 80);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(
      shouldPlay,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(!shouldPlay);
    assertNoLoudGap(s);
  });

  it("plays only the qualifying ADVENTURE Tamer when the gate is open", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "base" }],
          hand: [
            { card: "ST20-08", as: "kabuterimon" },
            { card: "BT1-085", as: "nonAdventureTamer" },
            { card: "ST20-12", as: "adventureTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    digivolve(s);
    await settle(() => s.perm("base").topCard?.cardId === "ST20-08");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST20-12"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-085")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonAdventureTamer").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("gives a legal evolution stack inherited Piercing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST20-09", as: "host", under: ["ST20-08"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    assertNoLoudGap(s);
  });
});
