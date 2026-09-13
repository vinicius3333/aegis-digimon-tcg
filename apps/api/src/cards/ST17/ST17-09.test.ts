import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-09 Cherubimon", () => {
  it("can refuse deletion and independently play an eligible green Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-07", as: "base" }],
          hand: [
            { card: "ST17-09", as: "cherubimon" },
            { card: "ST17-04", as: "fromHand" },
          ],
          trash: [{ card: "ST17-02", as: "fromTrash" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT1-010", as: "opponentOther" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    const handId = s.inst("fromHand").instanceId;
    const opponentId = s.perm("opponent").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    let decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([handId, s.inst("fromTrash").instanceId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [handId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === handId),
    );
    expect(s.state.memory).toBe(6);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === opponentId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === handId)).toBe(true);
  });

  it("uses the exact Antylamon alternate route for three memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-049", as: "antylamon" }],
        hand: [{ card: "ST17-09", as: "cherubimon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("antylamon").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").topCard.cardId === "ST17-09");
    expect(s.state.memory).toBe(0);
    expect(s.perm("antylamon").stack.map((card) => card.cardId)).toEqual(["BT17-049"]);
    expect(s.state.players[0]!.deck.length).toBeGreaterThan(0);
  });

  it("has Alliance, deletes an opposing level 4 Digimon, and plays a qualifying card from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-07", as: "base" }],
          hand: [{ card: "ST17-09", as: "cherubimon" }],
          trash: [
            { card: "ST17-04", as: "revived" },
            { card: "BT1-009", as: "wrongColor" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(false);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04"),
    );
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(true);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("uses its printed Alliance in a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST17-09", as: "cherubimon" },
          { card: "ST1-02", as: "ally" },
        ],
      },
      1: { security: ["ST2-10", "ST2-10"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("cherubimon").permanentId, "Alliance")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cherubimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.events.find((event) => event.kind === "alliancePrompt")).toMatchObject({
      permanentId: s.perm("cherubimon").permanentId,
    });
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "allianceResolved")).toBe(true);
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("cherubimon").permanentId),
    ).toBe(true);
  });
  it("can delete an own level-4 Digimon and then play the exact chosen trash card for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-07", as: "base" },
            { card: "ST17-05", as: "ownTarget" },
            { card: "ST17-07", as: "ownTooHigh" },
          ],
          hand: [{ card: "ST17-09", as: "cherubimon" }],
          trash: [{ card: "ST17-02", as: "otherLegal" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "opponentTarget" },
            { card: "BT1-010", as: "opponentOther" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    const revivedId = s.inst("ownTarget").instanceId;
    const otherLegalId = s.inst("otherLegal").instanceId;
    const originalTargetPermanentId = s.perm("ownTarget").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const deleteChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deleteChoice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetChoice = s.state.pendingDecision!;
    const targetOptions = s.decisions.at(-1)?.req.options?.candidateInstanceIds ?? [];
    expect(targetOptions).toEqual(
      expect.arrayContaining([s.perm("ownTarget").permanentId, s.perm("opponentTarget").permanentId]),
    );
    expect(targetOptions).not.toContain(s.perm("ownTooHigh").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ownTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const playChoiceConsent = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playChoiceConsent.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const playChoice = s.state.pendingDecision!;
    const playCandidates = s.decisions.at(-1)?.req.options?.candidateInstanceIds ?? [];
    expect(playCandidates).toHaveLength(2);
    expect(playCandidates).toEqual(expect.arrayContaining([revivedId, otherLegalId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [revivedId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === revivedId),
    );
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === originalTargetPermanentId)).toBe(false);
    const replayed = s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === revivedId);
    expect(replayed).toBeDefined();
    expect(replayed!.topCard.instanceId).toBe(revivedId);
    expect(s.state.players[0]!.deck.length).toBeGreaterThan(0);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.permanentId === s.perm("opponentTarget").permanentId),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
