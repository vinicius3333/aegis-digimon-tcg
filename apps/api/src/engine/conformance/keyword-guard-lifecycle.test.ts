import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

const NEUTRAL = "BT1-009";
const TARGET = "BT6-063"; // BigMamemon: printed 10000 DP, no effect or inherited effect.

describe("Guard departure lifecycle", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0322",
      "16-45: other Digimon, opposing effect, self-deletion and refusal",
      "cf0369cd214393a2e5ed1318f3ded85cfc1c7a26b0ac64c3f19be0a72ecc8411",
    );
    cite(
      "comprehensive-0177",
      "15-8-5: interrupt before departure and guard the resolving immediate effect",
      "50033be9509953fb2b00c56799e11cee1838740d4c5c06a962969a748a6fcdde",
    );
  });

  it.each(["EX12-056", "EX13-052", "EX13-065"])(
    "%s pays its own printed Guard to save another Digimon from public Gaia Force",
    async (holder) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: NEUTRAL, as: "red" }],
            hand: [{ card: "ST1-16", as: "option" }],
            deck: [NEUTRAL, NEUTRAL],
            security: [NEUTRAL],
          },
          1: {
            battleArea: [
              { card: holder, as: "guard" },
              { card: TARGET, as: "target" },
            ],
            deck: [NEUTRAL, NEUTRAL],
            security: [NEUTRAL],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
      );
      s.state.memory = 10;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      const guardId = s.inst("guard").instanceId;
      const targetId = s.inst("target").instanceId;
      preferred.push(targetId);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
      expect(s.state.memory).toBe(2);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([targetId]);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([guardId]);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
        s.inst("red").instanceId,
      ]);
      expect(s.state.players[1]!.hand).toHaveLength(0);
      expect(s.state.players[1]!.deck).toHaveLength(2);
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    },
  );

  it.each([
    ["ST2-16", "BT1-027", "hand"],
    ["BT2-102", "BT1-064", "deck"],
  ])("prevents opposing %s relocation by paying Guard, destination %s", async (option, colorSource) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: colorSource }],
          hand: [{ card: option, as: "option" }],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
        1: {
          battleArea: [
            { card: "EX13-052", as: "guard" },
            { card: TARGET, as: "target", suspended: true },
          ],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const guardId = s.inst("guard").instanceId;
    const targetId = s.inst("target").instanceId;
    preferred.push(targetId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([targetId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([guardId]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each([true, false])("face-up security grants Guard to the actual ME holder, faceUp: %s", async (faceUp) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEUTRAL }],
          hand: [{ card: "ST1-16", as: "option" }],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
        1: {
          battleArea: [
            { card: "EX12-008", as: "me" },
            { card: TARGET, as: "target" },
          ],
          deck: [NEUTRAL, NEUTRAL],
          security: [{ card: "EX12-072", as: "security", faceUp }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const holderId = s.inst("me").instanceId;
    const targetId = s.inst("target").instanceId;
    const securityId = s.inst("security").instanceId;
    preferred.push(targetId);
    expect(observe(s.engine).hasKeyword(s.perm("me"), "Guard")).toBe(faceUp);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Guard")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      faceUp ? targetId : holderId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([faceUp ? holderId : targetId]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("one paid grantor saves both targets of public Iron-Fisted Onslaught after its aura disappears", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-052", as: "black" }],
          hand: [{ card: "BT6-106", as: "option" }],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
        1: {
          battleArea: [
            { card: "EX13-063", as: "prince" },
            { card: "BT1-043", as: "a" },
            { card: "BT1-043", as: "b" },
          ],
          deck: [
            { card: "BT1-012", as: "one" },
            { card: "BT1-012", as: "two" },
            { card: "BT1-012", as: "three" },
          ],
          security: [NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const princeId = s.inst("prince").instanceId;
    const a = s.inst("a").instanceId;
    const b = s.inst("b").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId).sort()).toEqual(
      [a, b].sort(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [princeId, s.inst("one").instanceId, s.inst("two").instanceId, s.inst("three").instanceId].sort(),
    );
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [optionId, s.inst("black").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("a Paishu produced by public evolution pays Guard without granting the parent Guard", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-056", as: "base" }],
          hand: [{ card: "EX12-057", as: "parent" }],
          deck: [NEUTRAL, NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "red" }],
          hand: [{ card: "ST1-16", as: "option" }],
          deck: [NEUTRAL, NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const parentId = s.inst("parent").instanceId;
    const baseId = s.inst("base").instanceId;
    const optionId = s.inst("option").instanceId;
    // The intent harness has no begin-turn intent. Drive the actual turn machine;
    // evolution, voluntary pass and opposing Option use remain public intents.
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: parentId,
        permanentId: s.perm("base").permanentId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Paishu") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    const token = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "TOKEN-Paishu")!;
    const tokenId = token.topCard.instanceId;
    expect(token.currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(token, "Guard")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("parent"), "Guard")).toBe(false);
    preferred.push(parentId);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await ownTurn;
    expect(s.events.filter((event) => event.kind === "turnEnded")).toMatchObject([{ endingSeat: 0, nextSeat: 1 }]);
    // runOneTurn closes a turn but leaves handoff to its caller, as runTurn's
    // existing test seam documents. This is not a handoff/room-loop certificate.
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opposingTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionId));
    await opposingTurn;
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([parentId]);
    expect(s.perm("parent").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    const owner = s.state.players[0]!;
    expect(
      [...owner.hand, ...owner.deck, ...owner.trash, ...owner.security].map((card) => card.instanceId),
    ).not.toContain(tokenId);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not use Guard when an opposing DP reduction deletes another Digimon by rule", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-045"], hand: [{ card: "BT6-101", as: "option" }], deck: [NEUTRAL, NEUTRAL] },
        1: {
          battleArea: [
            { card: "EX13-052", as: "guard" },
            { card: TARGET, as: "target" },
          ],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const targetId = s.inst("target").instanceId;
    preferred.push(targetId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("guard").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([targetId]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX13-052")).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not use Guard against a public battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-024", as: "attacker" }], deck: [NEUTRAL, NEUTRAL], security: [NEUTRAL] },
        1: {
          battleArea: [
            { card: "EX13-052", as: "guard" },
            { card: TARGET, as: "target", suspended: true },
          ],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const targetId = s.inst("target").instanceId;
    const attackerId = s.inst("attacker").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("guard").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([targetId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([attackerId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX13-052")).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not use Guard to prevent the controller's public Heat Viper payment", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-052", as: "guard" },
            { card: TARGET, as: "payment" },
            { card: "BT2-067", as: "purple" },
          ],
          hand: [{ card: "BT2-109", as: "option" }],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
        1: { battleArea: [{ card: "BT1-037", as: "victim" }], deck: [NEUTRAL, NEUTRAL], security: [NEUTRAL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const paymentId = s.inst("payment").instanceId;
    const victimId = s.inst("victim").instanceId;
    preferred.push(paymentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId).sort()).toEqual(
      [s.inst("guard").instanceId, s.inst("purple").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual([paymentId, optionId].sort());
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([victimId]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX13-052")).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("a lone security-granted Guard holder cannot pay to save itself", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [NEUTRAL], hand: [{ card: "ST1-16", as: "option" }], deck: [NEUTRAL, NEUTRAL] },
        1: {
          battleArea: [{ card: "EX12-008", as: "me" }],
          security: [{ card: "EX12-072", as: "security", faceUp: true }],
          deck: [NEUTRAL, NEUTRAL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const holderId = s.inst("me").instanceId;
    expect(observe(s.engine).hasKeyword(s.perm("me"), "Guard")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([holderId]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("only the actual granted holder's controller can answer its Guard decision", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEUTRAL, as: "red" }],
          hand: [{ card: "ST1-16", as: "option" }],
          deck: [NEUTRAL, NEUTRAL],
        },
        1: {
          battleArea: [
            { card: "EX13-063", as: "prince" },
            { card: TARGET, as: "guard" },
          ],
          deck: [
            { card: "BT1-012", as: "one" },
            { card: "BT1-012", as: "two" },
            { card: "BT1-012", as: "three" },
          ],
          security: [NEUTRAL],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const princeId = s.inst("prince").instanceId;
    const guardId = s.inst("guard").instanceId;
    preferred.push(princeId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!;
    expect(request.seat).toBe(1);
    expect(request.req.sourceCardId).toBe(TARGET);
    expect(request.req.options?.effectText).toBe("＜Guard＞");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(decision.decisionId);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([guardId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [princeId, s.inst("one").instanceId, s.inst("two").instanceId, s.inst("three").instanceId].sort(),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [optionId, s.inst("red").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it.each(["Guard", "Detach"])("lets the controller choose %s when both keyword reactions apply", async (chosen) => {
    const preferred: string[] = [];
    const preferredKeys = [chosen === "Guard" ? "EX13-052" : "BT26-019"];
    const s = setupEngine(
      {
        0: { battleArea: [NEUTRAL], hand: [{ card: "ST1-16", as: "option" }], deck: [NEUTRAL, NEUTRAL] },
        1: {
          battleArea: [
            { card: "EX13-052", as: "guard" },
            { card: "BT26-019", as: "target", linked: [{ card: "BT26-010", as: "link" }] },
          ],
          deck: [NEUTRAL, NEUTRAL],
          security: [NEUTRAL],
        },
      },
      {
        autoAcceptOptional: false,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderTriggers: false,
        preferInstanceIds: preferred,
        preferTriggerKeys: preferredKeys,
      },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const guardId = s.inst("guard").instanceId;
    const targetId = s.inst("target").instanceId;
    const linkId = s.inst("link").instanceId;
    preferred.push(targetId);
    preferredKeys.push(chosen === "Guard" ? guardId : targetId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.state.pendingDecision!;
    const orderPayload = JSON.parse(order.payloadJson ?? "{}") as {
      triggerKeys?: string[];
      triggerCardIds?: string[];
    };
    const triggerKeys = orderPayload.triggerKeys ?? [];
    const triggerCardIds = orderPayload.triggerCardIds ?? [];
    const chosenCardId = chosen === "Guard" ? "EX13-052" : "BT26-019";
    const chosenKey = triggerKeys.find(
      (key, index) => triggerCardIds[index] === chosenCardId || key.includes(chosenCardId),
    );
    expect(chosenKey).toBeDefined();
    expect(order.seat).toBe(1);
    const unauthorized = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: order.decisionId,
      response: { kind: "orderTriggers", order: [chosenKey!] },
    });
    expect(unauthorized.ok).toBe(false);
    expect(unauthorized.reason).toBe("decision-pending");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [chosenKey!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const selected = s.state.pendingDecision!;
    const selectedRequest = s.decisions.at(-1)!.req;
    expect(selectedRequest.sourceCardId).toBe("EX13-052");
    expect(selectedRequest.options?.effectText).toContain("Guard");
    expect(s.decisions.some(({ req }) => req.kind === "selectCards" && req.sourceCardId === "BT26-019")).toBe(
      chosen === "Detach",
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: selected.decisionId,
        response: {
          kind: "optional",
          accept: chosen === "Guard",
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[0]!.trash.some((card) => card.instanceId === optionId),
    );
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId).sort()).toEqual(
      (chosen === "Guard" ? [targetId] : [guardId, targetId]).sort(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
      (chosen === "Guard" ? [guardId, linkId] : [linkId]).sort(),
    );
    expect(s.perm("target").linked.map((card) => card.instanceId)).toEqual([]);
    const choices = s.decisions
      .filter(({ req }) => req.kind === "orderTriggers")
      .flatMap(({ req }) => req.options?.triggerKeys ?? [])
      .filter((key) => key.startsWith("replacement/"));
    expect(choices).toHaveLength(2);
    expect(new Set(choices.map((key) => key.split("/")[1])).size).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
