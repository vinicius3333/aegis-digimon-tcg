import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-070.js";
import "../BT6/BT6-083.js";
import "../BT6/BT6-085.js";
import "../BT6/BT6-086.js";
import "./P-112.js";

describe("P-112 Morphomon", () => {
  it("reduces one Eosmon evolution per turn, then resets on the natural cycle", async () => {
    expect(getCardDefinition("P-112")).toMatchObject({ nameEn: "Morphomon", kinds: ["Digimon"], level: 3 });
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-070", as: "host", under: [{ card: "P-112", as: "source" }] },
            { card: "BT6-085", as: "firstAttacker" },
            { card: "BT6-085", as: "secondAttacker" },
            { card: "BT6-085", as: "thirdAttacker" },
          ],
          hand: [
            { card: "BT6-083", as: "firstEosmon4" },
            { card: "BT6-083", as: "secondEosmon4" },
            { card: "BT6-083", as: "thirdEosmon4" },
            { card: "BT6-085", as: "eosmon5" },
            { card: "BT6-086", as: "eosmon6" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-101"),
        },
        1: {
          battleArea: [{ card: "BT6-085", as: "opponentEosmon" }],
          deck: Array.from({ length: 20 }, () => "BT1-101"),
          security: ["BT1-028", "BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("firstEosmon4").instanceId,
      s.inst("secondEosmon4").instanceId,
      s.inst("thirdEosmon4").instanceId,
    );
    s.state.memory = 10;
    await s.ready();
    const originalBaseId = s.perm("host").topCard.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("firstEosmon4").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("eosmon5").instanceId);
    for (const attacker of ["secondAttacker"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    }
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("secondEosmon4").instanceId),
    ).toBe(true);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("eosmon5").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon6").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("thirdAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("thirdEosmon4").instanceId)).toBe(
      true,
    );
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("eosmon6").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === originalBaseId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon6").instanceId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("may place itself under an Eosmon and play the revealed Menoa Bellucci", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-083", as: "eosmon" }],
          hand: [{ card: "P-112", as: "morphomon" }],
          deck: [{ card: "BT6-092", as: "menoa" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("morphomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT6-092"));
    const eosmon = s.perm("eosmon");
    expect(eosmon.stack.some((card) => card.instanceId === s.inst("morphomon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("menoa").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("reveals three and adds both Eosmon and Menoa Bellucci when both are present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-112", as: "morphomon" }],
          deck: [
            { card: "BT6-083", as: "eosmon" },
            { card: "BT6-092", as: "menoa" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("morphomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("menoa").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("menoa").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });

  it("adds the one matching card when only one of Eosmon or Menoa is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-112", as: "morphomon" }],
          deck: [{ card: "BT6-083", as: "eosmon" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("morphomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eosmon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
