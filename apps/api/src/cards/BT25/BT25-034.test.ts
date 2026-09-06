import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled as BT25_034 } from "./BT25-034.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-034 Angemon", () => {
  it("only plays an eligible Angel or Iliad Digimon from hand when trashed from security by an effect", () => {
    const effect = BT25_034.effects?.find((entry) => entry.trigger === "OnDiscardSecurity");
    expect(effect).toBeDefined();
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      payCost: false,
      target: {
        filter: {
          controller: "mine",
          zone: "hand",
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Angel", "Iliad"], match: "trait" }],
        },
        count: 1,
      },
    });
  });

  it("keeps Ascension and inherited Barrier as keyword-only entries", () => {
    expect(BT25_034.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Ascension", raw: "＜Ascension＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
  });

  it("publicly evolves from a TS level 3 at the printed cost and rejects a non-TS source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-030", as: "tsBase" }], hand: [{ card: "BT25-034", as: "angemon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("angemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard?.cardId === "BT25-034");
    expect(s.state.memory).toBe(1);
    expect(s.perm("tsBase").stack.map((card) => card.cardId)).toEqual(["BT25-030"]);
    expect(observe(s.engine).hasKeyword(s.perm("tsBase"), "Ascension")).toBe(true);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonTsBase" }],
        hand: [{ card: "BT25-034", as: "angemon" }],
        deck: ["BT1-010"],
      },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonTsBase").permanentId,
        instanceId: invalid.inst("angemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("plays an eligible hand card after direct effect trash from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-034", as: "securityAngemon" }],
          hand: [{ card: "BT25-031", as: "iliadHand" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-031"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT25-031");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityAngemon").instanceId);
  });

  it("does not trigger from a security reveal without a direct effect trash", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-034", as: "securityAngemon" }],
          hand: [{ card: "BT25-031", as: "iliadHand" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityAngemon"));
    await settle();
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("securityAngemon").instanceId }),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("iliadHand").instanceId }),
    );
  });

  it("does not trigger from a real security check reveal", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-034", as: "securityAngemon" }],
          hand: [{ card: "BT1-053", as: "eligibleHand" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("securityAngemon").instanceId),
    );
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("securityAngemon").instanceId }),
    );
    expect(s.state.players[0]!.battleArea).not.toContainEqual(
      expect.objectContaining({ topCard: expect.objectContaining({ cardId: "BT1-053" }) }),
    );
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("eligibleHand").instanceId }),
    );
  });

  it("plays level-4 Angel and Iliad candidates but rejects level-5, wrong-trait, and Tamer candidates", async () => {
    const angel = setupEngine(
      {
        0: { security: [{ card: "BT25-034", as: "securityAngemon" }], hand: [{ card: "BT1-053", as: "angel" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await angel.ready();
    await advance(angel.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => angel.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-053"));
    expect(angel.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toContain("BT1-053");

    const iliad = setupEngine(
      {
        0: { security: [{ card: "BT25-034", as: "securityAngemon" }], hand: [{ card: "BT24-011", as: "iliad" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await iliad.ready();
    await advance(iliad.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => iliad.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-011"));
    expect(iliad.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toContain("BT24-011");

    const rejected = setupEngine(
      {
        0: {
          security: [{ card: "BT25-034", as: "securityAngemon" }],
          hand: ["BT25-038", "BT1-009", "BT24-102"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await rejected.ready();
    await advance(rejected.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle();
    expect(rejected.state.players[0]!.battleArea).toHaveLength(0);
    expect(rejected.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-038", "BT1-009", "BT24-102"]);
  });

  it("naturally responds when a public attack effect trashes the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-034", as: "securityAngemon" }],
          hand: [{ card: "BT25-031", as: "iliadHand" }],
          battleArea: [{ card: "BT13-037", as: "securityTrasher" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("securityTrasher").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-031"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityAngemon").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT25-031");
  });

  it("accepts inherited Barrier through a legal BT25-039 over BT25-034 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-039", as: "host", under: ["BT25-034"], suspended: true }],
        security: [{ card: "BT1-001", as: "barrierCost" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("activates Ascension in a real battle deletion and places Angemon on top security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-034", as: "angemon", suspended: true }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
      },
      { autoAcceptOptional: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("angemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const ascensionDecision = s.state.pendingDecision!;
    expect(ascensionDecision.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ascensionDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("angemon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.players[0]!.security[0]?.instanceId === s.inst("angemon").instanceId,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("angemon").instanceId }),
    );
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("angemon").instanceId, faceUp: false });
  });

  it("allows inherited Barrier refusal and no-security deletion", async () => {
    const refused = setupEngine({
      0: {
        battleArea: [{ card: "BT25-039", as: "host", under: ["BT25-034"], suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    refused.state.turnSeat = 1;
    await refused.ready();
    expect(
      refused.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: refused.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: refused.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => refused.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      refused.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: refused.perm("host").permanentId,
        accept: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(refused.engine).isAttacking());
    expect(refused.state.players[0]!.battleArea).toHaveLength(0);

    const unpaid = setupEngine({
      0: { battleArea: [{ card: "BT25-039", as: "host", under: ["BT25-034"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    unpaid.state.turnSeat = 1;
    await unpaid.ready();
    expect(
      unpaid.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: unpaid.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: unpaid.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(unpaid.engine).isAttacking());
    expect(unpaid.state.players[0]!.battleArea).toHaveLength(0);
    expect(unpaid.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
  });
});
