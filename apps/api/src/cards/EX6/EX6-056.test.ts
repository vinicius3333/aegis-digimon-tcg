import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-056.js";

describe("EX6-056 Beelzemon", () => {
  it("has Rush, trashes four deck cards, and de-digivolves an opponent by two when your trash has ten cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Rush");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "TrashTopDeck", amount: 4 },
      { kind: "DeDigivolve", amount: 2, stopAtLevel: 3, condition: { kind: "youHave", count: 10 } },
    ]);
  });
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins in breeding when leaving outside battle", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      leaveCause: "otherThanBattle",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "PlaceUnder", target: { from: ["trash"] }, underFilter: { zone: "breeding" } }],
    }));
  it("publicly trashes four cards from the deck on play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-056", as: "beelze" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beelze"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(14);
  });

  it("publicly de-digivolves exactly two cards after the four-card trash reaches ten", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-056", as: "beelze" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: Array.from({ length: 6 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-053", "BT1-009"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beelze"));
    if (s.state.pendingDecision?.kind === "chooseTargets") {
      const decision = s.state.pendingDecision;
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      } as never);
    }
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("does not de-digivolve when the four-card trash leaves fewer than ten cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-056", as: "beelze" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-053", "BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beelze"));

    expect(s.perm("target").topCard?.cardId).toBe("BT1-060");
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("uses the legal Purple Lv.5 evolution route for three memory and rejects an off-color source", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT10-079", as: "purpleBase" }],
        hand: [{ card: "EX6-056", as: "beelze" }],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("purpleBase").permanentId,
        instanceId: legal.inst("beelze").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("purpleBase").topCard?.cardId === "EX6-056");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("purpleBase").stack.map((card) => card.cardId)).toEqual(["BT10-079"]);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "redBase" }],
        hand: [{ card: "EX6-056", as: "beelze" }],
      },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redBase").permanentId,
        instanceId: illegal.inst("beelze").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.perm("redBase").topCard?.cardId).toBe("BT1-020");
  });
});
