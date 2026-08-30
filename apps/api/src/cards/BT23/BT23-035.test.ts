import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-035.js";

describe("BT23-035 Dynasmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-035")).toMatchObject({
      cardId: "BT23-035",
      nameEn: "Dynasmon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Witchelny", "CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("reduces current and later-played opposing Digimon for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-035", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "current" }],
          hand: [{ card: "BT1-019", as: "future" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const currentPermanentId = s.perm("current").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === currentPermanentId),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("current").instanceId)).toBe(true);

    await advance(s.engine).verb.playInstances([s.inst("future").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("future").instanceId)).toBe(true);
  });

  it("does not reduce DP when its security-trash cost cannot be paid", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-035", as: "dynasmon" }] },
      1: { battleArea: [{ card: "BT1-020", as: "target" }] },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("ignores opposing security removal, then buffs and recovers any deck-top card from its own removal", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-035", as: "dynasmon" }],
        security: [
          { card: "BT1-009", as: "ownTop" },
          { card: "BT1-010", as: "ownBottom" },
        ],
        deck: [{ card: "BT23-100", as: "recoveryOption" }],
      },
      1: { security: [{ card: "BT1-011", as: "opposingSecurity" }] },
    });
    const recoveredId = s.inst("recoveryOption").instanceId;

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: recoveredId });
  });

  it("exposes Barrier through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-035", as: "dynasmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dynasmon"), "Barrier")).toBe(true);
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("requires trashing the top security card to reduce all opposing Digimon by 6000", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "ModifyDP",
        playerWide: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
        amount: -6000,
        duration: "forTheTurn",
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
        },
      });
      expect(action.optional).toBe(true);
      expect(action.abortOnDecline).toBe(true);
    }
  });

  it("may decline the top-security processing condition before trashing or reducing DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-035", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-035"));
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("gains Security Attack +1 and conditionally recovers at end of the security-removal trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "mine" },
    });
    expect(effect.actions[0].actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "untilYourTurnEnd" },
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        controller: "mine",
        from: ["deck"],
        toTop: true,
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      },
    ]);
  });
});
