import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-055.js";
import "../EX8/EX8-069.js";

describe("BT18-055 AncientTroymon", () => {
  it("trashes the opponent's top security card when their Digimon becomes suspended", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Replacement", actions: [{ kind: "Modal", choose: 1, optional: true }] }],
    });
    const replacement = compiled.effects[1]!.actions[0]!;
    if (replacement.kind !== "Replacement") throw new Error("expected leave replacement");
    const modal = replacement.actions?.[0];
    if (modal?.kind !== "Modal") throw new Error("expected leave modal");
    expect(modal.options.flat().every((action) => !("optional" in action) || action.optional !== true)).toBe(true);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Arbormon"] }, { names: ["Petaldramon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-055", as: "ancientTroymon" }] },
      1: {
        battleArea: [{ card: "BT1-030", as: "opponentDigimon" }],
        security: ["BT1-010", "BT1-011"],
      },
    });
    const top = s.state.players[1]!.security[0]!.instanceId;

    await advance(s.engine).verb.suspend([s.perm("opponentDigimon").permanentId]);
    await settle(() => !s.state.players[1]!.security.some((card) => card.instanceId === top));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === top)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("opponentDigimon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponentDigimon").permanentId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it.each([
    [0, "hand"],
    [1, "battleArea"],
  ] as const)("may choose leave-play option %i to move an eligible stack card to %s", async (optionIndex, zone) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-055", as: "ancient", under: ["BT18-047"] }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: optionIndex === 0,
        preferOptionIndex: optionIndex,
      },
    );
    await s.ready();
    const materialId = s.perm("ancient").stack[0]!.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byRule")).toBe(1);
    await settle(() =>
      zone === "hand"
        ? s.state.players[0]!.hand.some(({ instanceId }) => instanceId === materialId)
        : s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === materialId),
    );

    expect(
      zone === "hand"
        ? s.state.players[0]!.hand.some(({ instanceId }) => instanceId === materialId)
        : s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === materialId),
    ).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("allows the leave-play effect to be refused without opening nested prompts", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-055", as: "ancient", under: ["BT18-047"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const materialId = s.perm("ancient").stack[0]!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byRule");
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === materialId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === materialId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("normally digivolves from a green level 5 for four memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-051", as: "entmon" }],
        hand: [{ card: "BT18-055", as: "ancient" }],
        deck: ["BT1-001"],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("entmon").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("entmon").topCard?.cardId === "BT18-055");

    expect(s.state.memory).toBe(1);
    expect(s.perm("entmon").stack.map(({ cardId }) => cardId)).toContain("BT18-051");
    assertNoLoudGap(s);
  });

  it("does not trash security when its controller's Digimon becomes suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-055", as: "ancient" },
          { card: "BT1-030", as: "ownDigimon" },
        ],
      },
      1: { security: ["BT1-010", "BT1-011"] },
    });

    await advance(s.engine).verb.suspend([s.perm("ownDigimon").permanentId]);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("triggers when an opposing Digimon becomes suspended by declaring an attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-030", as: "attacker" }],
        security: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: { battleArea: [{ card: "BT18-055", as: "ancient" }] },
    });
    await s.ready();
    const top = s.state.players[0]!.security[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === top));

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === top)).toBe(true);
    assertNoLoudGap(s);
  });

  it("filters ineligible cards from its own stack when resolving the leave modal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-055", as: "ancient", under: ["BT1-078", "BT1-030", "BT18-047"] }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 0,
      },
    );
    const eligible = s.perm("ancient").stack.find(({ cardId }) => cardId === "BT18-047")!;

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byRule");
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === eligible.instanceId));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT18-047"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT18-055", "BT1-078", "BT1-030"]),
    );
    assertNoLoudGap(s);
  });

  it("triggers for a non-deletion leave and cleanly no-ops when no stack card is eligible", async () => {
    const bounce = setupEngine(
      { 0: { battleArea: [{ card: "BT18-055", as: "ancient", under: ["BT18-047"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    const eligibleId = bounce.perm("ancient").stack[0]!.instanceId;
    await advance(bounce.engine).verb.returnToHand([bounce.perm("ancient").topCard!.instanceId]);
    await settle(() => bounce.state.players[0]!.hand.some(({ instanceId }) => instanceId === eligibleId));
    expect(bounce.state.players[0]!.hand.some(({ instanceId }) => instanceId === eligibleId)).toBe(true);

    const unavailable = setupEngine(
      { 0: { battleArea: [{ card: "BT18-055", as: "ancient", under: ["BT1-078", "BT1-030"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(unavailable.engine).verb.deletePermanent([unavailable.perm("ancient").permanentId], "byRule");
    await settle(() => unavailable.state.players[0]!.battleArea.length === 0);
    expect(unavailable.state.pendingDecision).toBeUndefined();
    expect(unavailable.state.players[0]!.hand).toHaveLength(0);
    expect(unavailable.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT18-055", "BT1-078", "BT1-030"]),
    );
    assertNoLoudGap(bounce);
    assertNoLoudGap(unavailable);
  });

  it("preserves Alliance DP and security-attack bonuses after Q3968 trashes the face-up grant", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-015", as: "attacker" },
          { card: "EX7-015", as: "ally" },
        ],
        security: [{ card: "EX8-069", as: "allianceSource", faceUp: true }],
      },
      1: {
        battleArea: [{ card: "ST18-07", as: "blocker" }],
        security: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    const attacker = s.perm("attacker");
    const ally = s.perm("ally");
    const sourceId = s.inst("allianceSource").instanceId;
    expect(attacker.keywords).toContain("Alliance");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (
      s.engine as unknown as {
        combat: { hasOpenAllianceDecision: boolean; hasOpenBlockWindow: boolean };
      }
    ).combat;
    for (let tick = 0; tick < 500 && !combat.hasOpenAllianceDecision; tick += 1) await Promise.resolve();
    expect(combat.hasOpenAllianceDecision).toBe(true);
    // Q3968 starts with Alliance already activated. Install AncientTroymon at that exact
    // open decision boundary so its OPT observes the ally's payment, not attack declaration.
    s.putOnBoard(1, { card: "BT18-055", as: "ancient" });
    await advance(s.engine).recompute();
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === sourceId) && combat.hasOpenBlockWindow,
      5000,
    );

    expect(ally.isSuspended).toBe(true);
    expect(attacker.keywords).not.toContain("Alliance");
    expect(attacker.currentDP).toBe(6000);
    expect(attacker.securityAttack).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        s.events.some(({ kind }) => kind === "combatResolved" || kind === "gameOver"),
      5000,
    );

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(attacker.currentDP).toBe(3000);
    expect(attacker.securityAttack).toBe(1);
    assertNoLoudGap(s);
  });

  it("DigiXroses with one Arbormon and one Petaldramon for 4 less", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-055", as: "ancient" },
          { card: "BT18-047", as: "arbormon" },
          { card: "BT18-050", as: "petaldramon" },
        ],
      },
    });
    s.state.memory = 13;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("arbormon").instanceId, s.inst("petaldramon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId).sort()).toEqual([
      "BT18-047",
      "BT18-050",
    ]);
    assertNoLoudGap(s);
  });

  it("rejects duplicate Arbormon for the distinct DigiXros slots", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-055", as: "ancient" },
          { card: "BT18-047", as: "arbormonA" },
          { card: "BT18-047", as: "arbormonB" },
        ],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("arbormonA").instanceId, s.inst("arbormonB").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    assertNoLoudGap(s);
  });
});
