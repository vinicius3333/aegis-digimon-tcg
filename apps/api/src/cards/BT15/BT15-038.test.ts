import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import { compiled } from "./BT15-038.js";

// A3 behavioral test for BT15-038 (Angewomon):
//   [On Play] By trashing the top or bottom card of your security stack,
//   1 of your opponent's Digimon gets -6000 DP until the end of their turn.
//
// Primary observable: playing BT15-038 with security available causes the target
// opponent Digimon to have -6000 DP applied.
//
const ANGEWOMON = "BT15-038";
const OPP_DIGIMON = "BT1-009"; // Monodramon Lv.3, 2000 DP
const SECURITY_CARD = "BT1-001"; // any card for security stack

describe("BT15-038 Angewomon [On Play] -6000 DP with security trash cost", () => {
  it("registers Blast Digivolve and executable owned-security recovery IR", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ event: "whenSecurityRemoved", sourceFilter: { controller: "mine" }, actions: [{ kind: "Recover" }] }],
    });
  });
  it("playing Angewomon with security available reduces opp Digimon DP by 6000", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: SECURITY_CARD, as: "secCard" }],
          hand: [{ card: ANGEWOMON, as: "card" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 8000, as: "oppDigi" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true }, // "Security Top" is option index 0
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    s.state.memory = 10;

    const secCard = s.inst("secCard");
    const oppDigi = s.perm("oppDigi");
    const card = s.inst("card");

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    // Wait for DP to change on opp Digimon (8000 - 6000 = 2000).
    await settle(() => {
      const perm = p1.battleArea.find((p) => p.permanentId === oppDigi.permanentId);
      return perm !== undefined && perm.currentDP < 8000;
    }, 600);

    const perm = p1.battleArea.find((p) => p.permanentId === oppDigi.permanentId);
    expect(perm?.currentDP).toBe(2000); // 8000 - 6000
    // Security card was consumed.
    expect(p0.security.some((c) => c.instanceId === secCard.instanceId)).toBe(false);
  });

  it("When Digivolving can pay with the exact bottom security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-037", as: "base" }],
          hand: [{ card: ANGEWOMON, as: "angewomon" }],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 8000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angewomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("recovers 1 when another effect removes a security card at 3 or fewer security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: ANGEWOMON, as: "angewomon" }],
        security: [{ card: SECURITY_CARD, as: "removed" }],
        deck: [{ card: "BT1-001", as: "recovery" }],
      },
      1: { battleArea: [{ card: OPP_DIGIMON, as: "opponent" }] },
    });

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-001");
  });

  it("does not recover when the post-removal security count is 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: ANGEWOMON, as: "angewomon" }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", { card: "BT1-005", as: "removed" }],
        deck: [{ card: "BT1-006", as: "deckTop" }],
      },
    });

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
  });

  it("ignores opponent security removal and shares one use across same-turn owned removals", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: ANGEWOMON, as: "angewomon" }],
        security: ["BT1-001", "BT1-002"],
        deck: ["BT1-003", "BT1-004", "BT1-005"],
      },
      1: { security: ["BT1-006"] },
    });

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    expect(s.state.players[0]!.security).toHaveLength(2);
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });

    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("resets recovery through public turn progression", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: ANGEWOMON, as: "angewomon" }],
        security: ["BT1-001", "BT1-002"],
        deck: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
      },
      1: { deck: ["BT1-007"] },
    });

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(s.state.players[0]!.security).toHaveLength(2);
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });

    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("Blast Digivolves from hand at Counter Timing without paying memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      1: {
        battleArea: [{ card: "BT15-037", as: "base" }],
        hand: [{ card: ANGEWOMON, as: "angewomon" }],
        security: ["BT1-001"],
      },
    });
    s.state.memory = 0;
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "counterWindowOpened"));
    const opened = s.events.find(({ kind }) => kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find(({ instanceId }) => instanceId === s.inst("angewomon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === ANGEWOMON);

    expect(s.state.memory).toBe(0);
  });
});
