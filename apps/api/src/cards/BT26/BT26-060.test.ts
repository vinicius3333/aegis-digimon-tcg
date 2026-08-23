import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-060.js";

describe("BT26-060 compiled fidelity", () => {
  it("encodes printed keywords, Succession, the deck-add delete watcher, and the explicit stacked-return seam", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, texts: ["Chronomon"], cost: 5, isAlternate: true },
      { level: 6, namesExact: ["Giant Slayer"], cost: 5, isAlternate: true },
    ]);
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(
      expect.arrayContaining(["SecurityAttack", "Reboot", "Blocker", "Succession"]),
    );
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "ReturnTopDigivolutionCards", cardsPerTarget: 5, order: "any", target: { count: 3 } },
    ]);
    expect(card?.effects?.[2]?.actions).toMatchObject([
      { kind: "GrantStatic", grant: "effects", duration: "permanent" },
    ]);
    expect(card?.effects?.[3]?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenEffectAddsToDeck", oncePerTurnKey: "BT26-060/delete-on-effect-adds-to-deck" },
    ]);
  });

  it("publicly returns the top five stacked cards from three opponents and reacts by deleting one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-060", as: "destroyMode" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", under: ["BT1-010", "BT1-011"] },
            { card: "BT1-012", as: "second", under: ["BT1-013", "BT1-014"] },
            { card: "BT1-015", as: "third", under: ["BT1-016", "BT1-017"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("destroyMode"));
    await settle(() => s.state.players[1]!.deck.length === 6 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.deck).toHaveLength(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
  });
});
