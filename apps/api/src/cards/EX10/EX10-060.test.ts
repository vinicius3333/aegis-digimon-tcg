import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-060.js";
import "../index.js";

const CARD_ID = "EX10-060";

describe("EX10-060 Lucemon: Satan Mode", () => {
  it("records the exact catalog and alternate evolution", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 7,
      playCost: 16,
      dp: 16000,
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 6 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon God"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Lucemon: Chaos Mode"], cost: 6, isAlternate: true }],
    });
  });

  it("gates highest-level deletion on playing Lucemon: Larva to an empty breeding area", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects!.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { controller: "mine", zone: "trash" }, count: 1 },
            from: ["trash"],
            payCost: false,
            breeding: true,
            requiresEmpty: "breedingArea",
            optional: true,
            abortOnDecline: true,
          },
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" },
              count: "all",
            },
            condition: { kind: "ifThisEffectActed" },
          },
        ],
      });
    }
  });

  it("plays Larva to breeding and deletes all opposing Digimon tied for highest level", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "satan" }], trash: [{ card: "BT18-086", as: "larva" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "EX10-026", as: "high1" },
            { card: "EX10-027", as: "high2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lowId = s.perm("low").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("satan"));
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT18-086");
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("larva").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lowId]);
  });

  it("does not delete when the breeding area is occupied", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "satan" }], breeding: { card: "BT1-001" }, trash: ["BT18-086"] },
        1: { battleArea: [{ card: "EX10-026", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("satan"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
  });

  it("CR 15-7-4 lets the controller decline the Larva play, which aborts the deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "satan" }], trash: [{ card: "BT18-086", as: "larva" }] },
        1: { battleArea: [{ card: "EX10-026", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("satan"));
    await settle(() => s.state.pendingDecision === null);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("larva").instanceId);
    expect(s.state.players[0]!.breeding?.topCard).toBeUndefined();
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
  });

  it("shares the once-per-turn budget between When Digivolving and When Attacking", () => {
    const reactions = compiled.effects!.filter((entry) => entry.frequency === "OncePerTurn");
    expect(reactions.map((entry) => entry.trigger)).toEqual(["WhenDigivolving", "WhenAttacking"]);
    expect(new Set(reactions.map((entry) => entry.sharedUseKey))).toEqual(new Set(["ir-shared-0"]));
    for (const effect of reactions)
      expect(effect.actions).toMatchObject([
        { kind: "Delete", controller: "opponent", optional: true },
        { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "ifThisEffectDidNotDelete" } },
        { kind: "Unsuspend", condition: { kind: "ifThisEffectDidNotDelete" } },
      ]);
  });

  it("Q5171 trashes top security, unsuspends, and consumes the shared use when the opponent declines", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "satan", suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "choice" }], security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("satan"));
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("satan").isSuspended).toBe(false);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("satan"));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("lets the opponent delete a Tamer, including a level-less permanent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "satan" }] },
        1: { battleArea: [{ card: "EX10-062", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const tamerId = s.perm("opponentTamer").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("satan"));
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== tamerId));

    // The [When Digivolving] opponent-choice target is "1 of their Digimon or Tamers". A Tamer
    // has no level, so this proves the target kind boundary rather than only another Digimon.
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === tamerId)).toBe(false);
  });
});
