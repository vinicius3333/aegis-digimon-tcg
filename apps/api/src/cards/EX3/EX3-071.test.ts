import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-071.js";

describe("EX3-071 Laser Cannon", () => {
  it("matches the official identity and complete Main/Security text", () => {
    const definition = getCardDefinition("EX3-071")!;
    expect(definition).toMatchObject({
      cardId: "EX3-071",
      nameEn: "Laser Cannon",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 5,
      rarity: "C",
      imageId: "EX3-071",
    });
    expect(definition.effectText).toContain("＜De-Digivolve 1＞");
    expect(definition.effectText).toContain("delete 1 of your opponent's Digimon with a play cost of 5 or less");
    expect(definition.securityEffectText).toBe("[Security] Activate this card's [Main] effect.");
  });

  it("De-Digivolves the chosen stack, then deletes the resulting cost-5 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-046", as: "blackSource" }], hand: [{ card: "EX3-071", as: "cannon" }] },
        1: { battleArea: [{ card: "EX3-053", under: ["EX3-049"], as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-053", "EX3-049"]),
    );
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("may De-Digivolve one Digimon and delete a different cost-5 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-046", as: "blackSource" }], hand: [{ card: "EX3-071", as: "cannon" }] },
        1: {
          battleArea: [
            { card: "EX3-053", under: ["EX3-050"], as: "stack" },
            { card: "EX3-049", as: "deleteTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("stack").permanentId, s.perm("deleteTarget").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 2);

    expect(s.perm("stack").topCard.cardId).toBe("EX3-050");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-053", "EX3-049"]),
    );
    assertNoLoudGap(s);
  });

  it("De-Digivolve stops at the level-3 last card before deleting a different Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-046", as: "blackSource" }], hand: [{ card: "EX3-071", as: "cannon" }] },
      1: {
        battleArea: [
          { card: "EX3-049", under: ["BT1-010"], as: "levelThreeBase" },
          { card: "EX3-049", as: "deleteTarget" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deDigivolveDecision = s.decisions.at(-1)!.req;
    expect(deDigivolveDecision).toMatchObject({
      sourceCardId: "EX3-071",
      kind: "chooseTargets",
      options: {
        candidateInstanceIds: [s.perm("levelThreeBase").permanentId, s.perm("deleteTarget").permanentId],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deDigivolveDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("levelThreeBase").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== deDigivolveDecision.decisionId,
    );
    const deleteDecision = s.decisions.at(-1)!.req;
    expect(deleteDecision).toMatchObject({
      sourceCardId: "EX3-071",
      kind: "chooseTargets",
      options: {
        candidateInstanceIds: [s.perm("levelThreeBase").permanentId, s.perm("deleteTarget").permanentId],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deleteDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("deleteTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("levelThreeBase").topCard.cardId).toBe("BT1-010");
    expect(s.perm("levelThreeBase").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["EX3-049", "EX3-049"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    assertNoLoudGap(s);
  });

  it("Security activates Main without paying memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "EX3-071", faceUp: true, as: "cannon" }] },
        1: { battleArea: [{ card: "EX3-053", under: ["EX3-049"], as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("cannon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("requires a black Digimon or Tamer to use from hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX3-071", as: "cannon" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});
