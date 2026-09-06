import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-066.js";

const CARD_ID = "BT25-066";

function deletionPrimitive(s: ReturnType<typeof setupEngine>) {
  return (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
}

describe("BT25-066 Guardromon", () => {
  it("matches the catalog and alternate-digivolves from an off-color level 3 TS card for 2", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Guardromon",
      colors: ["Black"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Machine", "Iliad", "TS"],
    });
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "guard" }],
        deck: ["BT1-001"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("guard").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(observe(legal.engine).hasKeyword(legal.perm("tsBase"), "Blocker")).toBe(true);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plain" }], hand: [{ card: CARD_ID, as: "guard" }] },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("guard").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("ordinary-digivolves from black non-TS Lv3 for 2 and rejects red ordinary", async () => {
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT10-058", as: "blackBase" }], hand: [{ card: CARD_ID, as: "guard" }] },
    });
    ordinary.state.memory = 3;
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("blackBase").permanentId,
        instanceId: ordinary.inst("guard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.perm("blackBase").topCard?.cardId === CARD_ID);
    expect(ordinary.state.memory).toBe(1);

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: CARD_ID, as: "guard" }] },
    });
    wrongColor.state.memory = 3;
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("redBase").permanentId,
        instanceId: wrongColor.inst("guard").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("prevents leaving by trashing exactly one of its own link cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "guard", linked: [{ card: "BT1-013", as: "link" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const guardId = s.perm("guard").permanentId;
    const linkId = s.inst("link").instanceId;
    await s.ready();
    expect(await deletionPrimitive(s).deletePermanent([guardId])).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === guardId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === linkId)).toBe(true);
  });

  it("plays for the catalog cost 5 and resolves Blocker through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], security: ["BT1-010"] },
        1: { hand: [{ card: CARD_ID, as: "guard" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("guard").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("guard").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("guard"), "Blocker")).toBe(true);

    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("guard").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("guard").permanentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("attacker").permanentId)).toBe(false);
  });

  it("can decline Blocker and lets the attack complete against security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 9000 }], security: ["BT1-010"] },
        1: { battleArea: [{ card: CARD_ID, as: "guard", dp: 5000 }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("guard").permanentId)).toBe(true);
  });

  it("naturally replaces deletion from a losing battle with its linked-card cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "guard", suspended: true, linked: [{ card: "BT1-013", as: "link" }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("guard").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("link").instanceId));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("guard").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
  });

  it("can decline the replacement, preserving the cost until normal deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "guard", linked: [{ card: "BT1-013", as: "link" }] }] },
    });
    const guardId = s.perm("guard").permanentId;
    const deletion = deletionPrimitive(s).deletePermanent([guardId]);
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    const prompt = s.decisions.findLast((decision) => decision.req.kind === "optional")!;
    s.engine.applyIntent(prompt.seat, {
      type: "respondDecision",
      decisionId: prompt.req.decisionId,
      response: { kind: "optional", accept: false },
    });
    expect(await deletion).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === guardId)).toBe(false);
  });

  it("cannot pay with another Digimon's link card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "guard" },
            { card: "BT1-013", as: "other", linked: [{ card: "BT1-013", as: "otherLink" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const guardId = s.perm("guard").permanentId;
    await s.ready();
    expect(await deletionPrimitive(s).deletePermanent([guardId])).toBe(1);
    expect(s.perm("other").linked).toHaveLength(1);
  });

  it("does not prevent leaving when the selected link-card cost fails to move", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "guard", linked: [{ card: "BT1-013", as: "link" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const guardId = s.perm("guard").permanentId;
    const primitives = (s.engine as unknown as { primitives: { trash: (...args: unknown[]) => Promise<never[]> } })
      .primitives;
    primitives.trash = async () => [];
    await s.ready();
    expect(await deletionPrimitive(s).deletePermanent([guardId])).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === guardId)).toBe(false);
  });

  it("grants inherited +1000 DP only while Guardromon is under a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-064", dp: 4000, as: "host", under: [CARD_ID] },
          { card: CARD_ID, dp: 5000, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("standalone").currentDP).toBe(5000);
  });
});
