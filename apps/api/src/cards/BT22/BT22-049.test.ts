import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-049.js";
import "./index.js";

async function endCurrentTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
  expect(mainPhase.isOpen).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

describe("BT22-049 Vegiemon", () => {
  it("requires all three face-down Ver.2 trash cards for the end-turn digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      payCost: true,
      optional: true,
      into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.2"], match: "trait" }] },
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        faceDown: true,
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ver.2"], match: "trait" }],
          },
          count: 3,
          from: ["trash"],
        },
      },
    });
  });

  it("retains inherited Piercing", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toMatchObject([{ keyword: "Piercing" }]);
  });

  it("pays all 3 face-down Ver.2 cards and evolves from hand at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-049", as: "vegiemon" }],
          hand: [{ card: "BT22-061", as: "vademon" }],
          trash: ["BT22-049", "BT22-049", "BT22-049"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    await endCurrentTurn(s);
    await settle(() => s.perm("vegiemon").topCard?.cardId === "BT22-061");

    // Vademon's optional return has no legal opposing target, so it cannot pay its
    // bottom-source cost. All 3 cards remain, proving they were placed before its timing opened.
    expect(s.perm("vegiemon").stack.filter((card) => !card.faceUp)).toHaveLength(3);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT22-049")).toHaveLength(0);
    // Ending the turn first crosses the gauge from +3 to -3; the normal cost-3
    // evolution then pays another 3 rather than resolving for free.
    expect(s.state.memory).toBe(-6);
  });

  it("cannot satisfy Q4902 with only 2 eligible trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-049", as: "vegiemon" }],
          hand: [{ card: "BT22-061", as: "vademon" }],
          trash: ["BT22-049", "BT22-049"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    await endCurrentTurn(s);
    await settle();

    expect(s.perm("vegiemon").topCard?.cardId).toBe("BT22-049");
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT22-049")).toHaveLength(2);
  });
});
