import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import "./EX3-066.js";

describe("EX3-066 Hyper Infinity Cannon", () => {
  it("matches the official two-color Option identity and complete text", () => {
    const definition = getCardDefinition("EX3-066")!;
    expect(definition).toMatchObject({
      cardId: "EX3-066",
      nameEn: "Hyper Infinity Cannon",
      colors: ["Red", "Black"],
      kinds: ["Option"],
      playCost: 6,
      rarity: "R",
      imageId: "EX3-066",
    });
    expect(definition.effectText).toContain("level 6 Digimon with [Machine] in its traits");
    expect(definition.effectText).toContain("＜De-Digivolve 3＞");
    expect(definition.effectText).toContain("from your hand or trash");
    expect(definition.securityEffectText).toBe("[Security] Activate this card's [Main] effect.");
  });

  it("Q3432 waives both color requirements with an own battle-area level 6 Machine", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-073", as: "machinedramon" }],
        hand: [{ card: "EX3-066", as: "cannon" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-066"));

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("does not waive colors for no Machine, a level 5 Machine, breeding, or the opponent's Machine", async () => {
    const boards: BoardSpec[] = [
      { 0: { hand: [{ card: "EX3-066", as: "cannon" }] } },
      { 0: { battleArea: [{ card: "BT1-024" }], hand: [{ card: "EX3-066", as: "cannon" }] } },
      { 0: { breeding: { card: "EX1-073" }, hand: [{ card: "EX3-066", as: "cannon" }] } },
      {
        0: { hand: [{ card: "EX3-066", as: "cannon" }] },
        1: { battleArea: [{ card: "EX1-073" }] },
      },
    ];
    for (const board of boards) {
      const s = setupEngine(board);
      s.state.memory = 6;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
        ok: false,
        reason: "color-requirement-unmet",
      });
    }
  });

  it("always De-Digivolves first and may decline the Cyborg cost without deleting", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-073", as: "machine" }],
          hand: [
            { card: "EX3-066", as: "cannon" },
            { card: "BT1-021", as: "cyborg" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-025", under: ["BT1-001", "BT1-009", "BT1-015", "BT1-020"], as: "stacked" },
            { card: "BT1-028", dp: 3000, as: "weak" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("stacked").permanentId);
    const stackedId = s.perm("stacked").permanentId;
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-066"));

    expect(s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === stackedId)?.stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("weak").permanentId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cyborg").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-066" && req.kind === "optional")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Machine family: pays with a hand Cyborg under the level 6 Machine, then deletes only 6000 DP or less", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-073", under: ["BT1-114"], as: "machine" },
          { card: "BT2-066", as: "machineAlternative" },
        ],
        hand: [
          { card: "EX3-066", as: "cannon" },
          { card: "BT1-021", as: "cyborg" },
          { card: "BT1-010", as: "unrelatedHand" },
        ],
        trash: [
          { card: "EX3-049", as: "trashCyborg" },
          { card: "EX3-069", as: "unrelatedTrash" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-025", under: ["BT1-001", "BT1-009", "BT1-015", "BT1-020"], as: "stacked" },
          { card: "BT1-028", dp: 3000, as: "weak" },
          { card: "BT1-030", dp: 6000, as: "boundary" },
          { card: "BT1-029", dp: 7000, as: "large" },
        ],
      },
    });
    const weakId = s.perm("weak").permanentId;
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deDigivolve = s.decisions.at(-1)!.req;
    expect(deDigivolve).toMatchObject({ sourceCardId: "EX3-066", kind: "chooseTargets", options: { timing: "Main" } });
    expect(deDigivolve.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.perm("stacked").permanentId,
        s.perm("weak").permanentId,
        s.perm("boundary").permanentId,
        s.perm("large").permanentId,
      ]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deDigivolve.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("stacked").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional" && s.decisions.length >= 2);
    const optional = s.decisions.at(-1)!.req;
    expect(optional).toMatchObject({ sourceCardId: "EX3-066", kind: "optional", options: { timing: "Main" } });
    expect(optional.options?.effectText).toContain("by placing 1 card with [Cyborg] in its traits");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.decisions.length >= 3);
    const cyborg = s.decisions.at(-1)!.req;
    expect(cyborg).toMatchObject({
      sourceCardId: "EX3-066",
      kind: "selectCards",
      options: {
        candidateInstanceIds: [s.inst("cyborg").instanceId, s.inst("trashCyborg").instanceId],
        visibleInstanceIds: [
          s.inst("cyborg").instanceId,
          s.inst("unrelatedHand").instanceId,
          s.inst("trashCyborg").instanceId,
          s.inst("unrelatedTrash").instanceId,
        ],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cyborg.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("cyborg").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets" && s.decisions.length >= 4);
    const host = s.decisions.at(-1)!.req;
    expect(host.options?.candidateInstanceIds).toEqual([
      s.perm("machine").permanentId,
      s.perm("machineAlternative").permanentId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: host.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("machine").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets" && s.decisions.length >= 5);
    const deletion = s.decisions.at(-1)!.req;
    expect(deletion).toMatchObject({ sourceCardId: "EX3-066", options: { min: 1, max: 1, timing: "Main" } });
    expect(deletion.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("weak").permanentId, s.perm("boundary").permanentId]),
    );
    expect(deletion.options?.candidateInstanceIds).not.toContain(s.perm("large").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletion.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("weak").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === weakId));

    expect(s.perm("machine").stack[0]!.cardId).toBe("BT1-021");
    expect(s.perm("machine").stack.at(-1)!.cardId).toBe("BT1-114");
    expect(s.perm("machineAlternative").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("boundary").permanentId,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("large").permanentId);
    assertNoLoudGap(s);
  });

  it("can pay with a Cyborg from trash and skips the optional delete when no legal cost exists", async () => {
    const paid = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-073", as: "machine" }],
          hand: [{ card: "EX3-066", as: "cannon" }],
          trash: [{ card: "BT1-021", as: "trashCyborg" }],
        },
        1: { battleArea: [{ card: "BT1-028", dp: 3000, as: "weak" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    paid.state.memory = 6;
    await paid.ready();
    expect(paid.engine.applyIntent(0, { type: "playCard", instanceId: paid.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => paid.state.players[1]!.battleArea.length === 0);
    expect(paid.perm("machine").stack[0]!.instanceId).toBe(paid.inst("trashCyborg").instanceId);

    const noCost = setupEngine({
      0: {
        battleArea: [{ card: "EX1-073", as: "machine" }],
        hand: [{ card: "EX3-066", as: "cannon" }],
      },
      1: { battleArea: [{ card: "BT1-028", dp: 3000, as: "weak" }] },
    });
    noCost.state.memory = 6;
    await noCost.ready();
    expect(noCost.engine.applyIntent(0, { type: "playCard", instanceId: noCost.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => noCost.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-066"));
    expect(noCost.state.players[1]!.battleArea).toHaveLength(1);
    expect(
      noCost.decisions.filter(({ req }) => req.sourceCardId === "EX3-066" && req.kind === "optional"),
    ).toHaveLength(0);
    assertNoLoudGap(noCost);
  });

  it("Security activates the full Main effect without paying use cost or color requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-073", as: "machine" }],
          security: [{ card: "EX3-066", faceUp: true, as: "securityCannon" }],
        },
        1: {
          battleArea: [{ card: "BT1-025", under: ["BT1-001", "BT1-009", "BT1-015", "BT1-020"], as: "stacked" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const stackedId = s.perm("stacked").permanentId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityCannon"));

    expect(s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === stackedId)?.stack).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
