import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_090 } from "./BT24-090.js";
import "../index.js";

describe("BT24-090 Abyss Sanctuary: Throne Room", () => {
  it("models face-up security effects and the bottom-security Main sequence", () => {
    const security = BT24_090.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions?.[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
    });
    expect(security?.actions?.[1]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
      while: {
        kind: "youHave",
        filter: {
          controller: "mine",
          zone: "battleArea",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Neptunemon", "Venusmon"], match: "nameExact" }],
        },
      },
    });

    const main = BT24_090.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", position: "bottom" });
    expect(main?.actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      toTop: false,
      faceUp: true,
    });
    expect(main?.actions?.[2]).toMatchObject({ kind: "PlayWithoutCost", reduceCostBy: 3, optional: true });
  });

  it("grants source-bound Blocker and conditional Alliance from face-up security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", as: "sanctuary", faceUp: true }],
        battleArea: [
          { card: "BT24-020", as: "eligible" },
          { card: "BT5-030", as: "neptunemon" },
          { card: "BT1-009", as: "ineligible" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("neptunemon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("neptunemon"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Blocker")).toBe(false);

    await advance(s.engine).verb.trash([s.inst("sanctuary").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(false);
  });

  it("publicly uses the face-up security Blocker aura", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", as: "sanctuary", faceUp: true }, { card: "BT1-013" }],
        battleArea: [{ card: "BT24-020", as: "blocker" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }], security: ["BT1-013"] },
    });
    const blockerId = s.perm("blocker").permanentId;
    await s.ready();
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("offers Blocker only to qualifying TS Digimon and permits a public refusal", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", as: "sanctuary", faceUp: true }, { card: "BT1-013" }],
        battleArea: [
          { card: "BT24-020", as: "qualifying" },
          { card: "BT24-011", as: "redTs" },
          { card: "BT1-032", as: "blueNonTs" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("qualifying").permanentId],
    });
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "blocked")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("publicly accepts Alliance from the face-up security aura", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", faceUp: true }],
        battleArea: [
          { card: "BT24-020", as: "attacker" },
          { card: "BT24-020", as: "ally" },
          { card: "BT5-030", as: "neptunemon" },
        ],
      },
      1: { security: [{ card: "BT1-090", as: "security" }], deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const prompt = s.events.find((event) => event.kind === "alliancePrompt");
    expect(prompt?.kind).toBe("alliancePrompt");
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("neptunemon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly declines Alliance while retaining the ally unsuspended", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", faceUp: true }],
        battleArea: [
          { card: "BT24-020", as: "attacker" },
          { card: "BT24-020", as: "ally" },
          { card: "BT5-030", as: "neptunemon" },
        ],
      },
      1: { security: [{ card: "BT1-090", as: "security" }], deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("expires Blocker and Alliance after a public face-up security check", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT24-090", as: "sanctuary", faceUp: true },
          { card: "BT1-013", as: "remaining" },
        ],
        battleArea: [{ card: "BT24-020", as: "qualifying" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-020", as: "attacker" }],
        security: [{ card: "BT1-013" }],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    const sanctuaryId = s.inst("sanctuary").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(sanctuaryId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("qualifying"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("qualifying"), "Alliance")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;
  });

  it("does not grant Alliance without an exact Neptunemon or Venusmon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", faceUp: true }],
        battleArea: [{ card: "BT24-020", as: "eligible" }],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(false);
  });

  it("refuses color-waived Option play while a face-up security card remains", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", as: "faceUpSource", faceUp: true }],
        hand: [{ card: "BT24-090", as: "option" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId });
    expect(result.ok).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("waives its color requirement with no face-up security cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT24-090", as: "option" }], security: ["BT1-013"] } },
      { autoDeclineOptional: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(optionId);
  });

  it("adds bottom security to hand, places itself face up, and plays a TS Digimon for 3 less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT24-020", as: "digimon" },
          ],
          security: [
            { card: "BT1-013", as: "top" },
            { card: "BT1-015", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sanctuary").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("digimon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("digimon").instanceId),
    ).toBe(true);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT24-090" && card.faceUp)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("sanctuary").instanceId,
    ]);
    expect(s.state.memory).toBe(7);
  });

  it("may refuse an eligible reduced-cost Main TS play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT24-024", as: "candidate" },
          ],
          security: [
            { card: "BT1-013", as: "top" },
            { card: "BT1-015", as: "bottom" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const candidateId = s.inst("candidate").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    const sanctuaryId = s.inst("sanctuary").instanceId;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sanctuaryId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === sanctuaryId));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(candidateId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(bottomId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays a level 4 blue or yellow TS Digimon from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-090", as: "sanctuary" }],
          trash: [{ card: "BT24-022", as: "digimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("sanctuary"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("digimon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("digimon").instanceId),
    ).toBe(true);
  });

  it("publicly checks Throne Room and plays a level-4 TS Digimon for free", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT1-013", as: "untouched" },
          ],
          hand: [{ card: "BT24-024", as: "candidate" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "attacker" }],
          security: [{ card: "BT1-013" }],
          hand: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sanctuaryId = s.inst("sanctuary").instanceId;
    const candidateId = s.inst("candidate").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === candidateId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(sanctuaryId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === candidateId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(candidateId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("publicly declines the Security TS play while Throne Room goes to trash", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT1-013", as: "untouched" },
          ],
          hand: [{ card: "BT24-024", as: "candidate" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "attacker" }],
          security: [{ card: "BT1-013" }],
          hand: ["BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sanctuaryId = s.inst("sanctuary").instanceId;
    const candidateId = s.inst("candidate").instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(sanctuaryId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(candidateId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("publicly plays an eligible level-4 TS Digimon from trash on Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT1-013", as: "untouched" },
          ],
          trash: [{ card: "BT24-024", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker" }], security: ["BT1-013"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sanctuaryId = s.inst("sanctuary").instanceId;
    const candidateId = s.inst("candidate").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === candidateId));
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(sanctuaryId);
    expect(s.state.players[0]!.security.map((c) => c.instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("does not play invalid mixed-color or non-TS Security candidates", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT1-013", as: "untouched" },
          ],
          hand: [
            { card: "BT24-028", as: "highTs" },
            { card: "BT1-032", as: "blueNonTs" },
            { card: "BT24-011", as: "redTs" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker" }], security: ["BT1-013"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sanctuaryId = s.inst("sanctuary").instanceId;
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(sanctuaryId);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([s.inst("highTs").instanceId, s.inst("blueNonTs").instanceId, s.inst("redTs").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("publicly pays the reduced Main cost for a TS Digimon and preserves security order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT24-024", as: "digimon" },
          ],
          security: [
            { card: "BT1-013", as: "top" },
            { card: "BT1-015", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sanctuary").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("digimon").instanceId),
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("digimon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("digimon").instanceId);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("bottom").instanceId }),
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("top").instanceId,
      s.inst("sanctuary").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("excludes invalid Main candidates by TS color and trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT24-011", as: "redTs" },
            { card: "BT1-028", as: "blueNonTs" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sanctuaryId = s.inst("sanctuary").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sanctuary").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === sanctuaryId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("redTs").instanceId, s.inst("blueNonTs").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may refuse the optional Security play and leaves the Option in security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-090", as: "sanctuary" }],
          hand: [{ card: "BT24-022", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("sanctuary"));
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("sanctuary").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
