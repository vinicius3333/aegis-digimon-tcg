import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-008.js";
import "../BT2/BT2-079.js";
import "./EX1-065.js";

describe("EX1-065 Diaboromon", () => {
  it("gives every allied Diaboromon Blocker during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-065", as: "source" },
          { card: "EX1-065", as: "other" },
        ],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009"],
      },
      1: {
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("loses the token's Blocker before blocker timing when the source is deleted while attacking", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX1-065", as: "source", dp: 4000 },
            { card: "TOKEN-Diaboromon", as: "token" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("source").permanentId, s.perm("source").topCard.instanceId);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("token"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX1-065"));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX1-065")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("token"), "Blocker")).toBe(false);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
  });

  it("plays its security token even when the attacking Digimon loses the security battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: ["EX1-065"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon"),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon")).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("plays the security token before an attacker's remaining security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-079", as: "attacker" }] },
        1: { security: ["EX1-065", "BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= 2);

    const tokenInstanceId = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon",
    )!.topCard.instanceId;
    const tokenIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(tokenInstanceId),
    );
    const securityChecks = s.events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.kind === "securityChecked");
    expect(tokenIndex).toBeGreaterThanOrEqual(0);
    expect(securityChecks).toHaveLength(2);
    expect(tokenIndex).toBeLessThan(securityChecks[1]!.index);
  });
});

describe("EX1-065 Diaboromon — KB Q&A rulings", () => {
  it("leaves the token without <Blocker> at blocker timing after a [When Attacking] effect deletes this Digimon (Q3251)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX1-065", as: "diaboromon", dp: 4000 },
            { card: "TOKEN-Diaboromon", as: "token" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("diaboromon").permanentId, s.perm("diaboromon").topCard.instanceId);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("token"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX1-065");
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("token").permanentId }).ok).toBe(
      false,
    );
    expect(s.perm("token").isSuspended).toBe(false);
  });

  it("plays the token even when this Security Digimon loses the battle (Q3252)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 20000 }] },
        1: { security: [{ card: "EX1-065", as: "securityDiaboromon" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityDiaboromon").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("attacker").permanentId,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["TOKEN-Diaboromon"]);
  });

  it("plays the token before the attacker's next security check (Q3253)", async () => {
    let tokensAtSecondCheck: number | undefined;
    let securityChecks = 0;
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-079", as: "attacker" }] },
        1: { security: ["EX1-065", "BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        onEvent(event) {
          if (event.kind !== "securityRevealed") return;
          securityChecks += 1;
          if (securityChecks === 2) {
            tokensAtSecondCheck = s.state.players[1]!.battleArea.filter(
              (permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon",
            ).length;
          }
        },
      },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(securityChecks).toBe(2);
    expect(tokensAtSecondCheck).toBe(1);
  });
});
