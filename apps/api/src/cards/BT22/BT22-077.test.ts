import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-077.js";

describe("BT22-077 Dianamon", () => {
  it("conditionally trashes four opponent stack cards, then unconditionally returns a low-stack Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 4,
      condition: { kind: "stackHasSameLevelCards", minCount: 2 },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsLte: 1 }, count: 1 },
    });
  });

  it("keeps separate once-per-turn unsuspend effects for the main and inherited text", () => {
    const endEffects = compiled.effects.filter((entry) => entry.trigger === "EndOfYourTurn");
    expect(endEffects).toHaveLength(2);
    expect(endEffects.map((entry) => entry.isInherited ?? false)).toEqual([false, true]);
    for (const effect of endEffects)
      expect(effect).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", optional: true }] });
  });

  it("still bottoms a low-stack opponent when the same-level condition is false", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-073", as: "host", under: ["BT22-072"] }],
          hand: [{ card: "BT22-077", as: "dianamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("dianamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
