import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-005.js";
import "../ST4/ST4-03.js";

describe("EX1-005 Tyrannomon", () => {
  it("plays only Taiga for free when digivolving if none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-001", as: "base" }],
          hand: [
            { card: "BT1-085", as: "notTaiga" },
            { card: "BT2-088", as: "taiga" },
            { card: "EX1-005", as: "evo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const taigaId = s.inst("taiga").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === taigaId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notTaiga").instanceId)).toBe(true);
  });

  it("does not play a second Taiga when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-001", as: "base" },
            { card: "BT2-088", as: "fieldTaiga" },
          ],
          hand: [
            { card: "BT2-088", as: "handTaiga" },
            { card: "EX1-005", as: "evo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-005");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("handTaiga").instanceId)).toBe(true);
  });

  it("grants inherited +2000 DP only to a Tyrannomon-named host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-024", as: "host", under: ["EX1-005"], dp: 7000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("honors refusal of the optional Taiga play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-001", as: "base" }],
          hand: [
            { card: "BT2-088", as: "taiga" },
            { card: "EX1-005", as: "evo" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-005");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("taiga").instanceId)).toBe(true);
  });

  it("shows the Your Turn Green grant on the EX1-005 host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-005", as: "host", under: ["BT1-010"], dp: 4000 }] } });
    await s.ready();
    expect(observe(s.engine).effectiveColors(s.perm("host"))).toContain("Green");
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("does not treat a revealed EX1-005 as Green (Q3192)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST4-03", as: "tentomon" }],
          deck: [
            { card: "EX1-005", as: "revealedTyrannomon" },
            { card: "ST4-12", as: "bottomBefore" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const revealedId = s.inst("revealedTyrannomon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tentomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.at(-1)?.instanceId === revealedId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === revealedId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(revealedId);
  });

  it("allows a Green/level-4 evolution from battle-area EX1-005 on your turn (Q3193)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-005", as: "tyrannomon", under: ["BT1-010"] }],
        hand: [{ card: "EX1-039", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tyrannomon").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tyrannomon").topCard.cardId === "EX1-039");
  });

  it("rejects the same Green/level-4 evolution from breeding (Q3194)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX1-005", as: "tyrannomon", under: ["BT1-010"] },
        hand: [{ card: "EX1-039", as: "evo" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tyrannomon").permanentId,
      instanceId: s.inst("evo").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("tyrannomon").topCard.cardId).toBe("EX1-005");
  });

  it("excludes a non-Tyrannomon host from the inherited DP bonus", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-020", as: "host", under: ["EX1-005"], dp: 6000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("does not grant the inherited DP or Green effect during the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-024", as: "host", under: ["EX1-005"], dp: 7000 }],
        hand: ["BT1-009"],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    expect(observe(s.engine).effectiveColors(s.perm("host"))).not.toContain("Green");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not apply the inherited DP effect to a Tyrannomon in breeding", async () => {
    const s = setupEngine({ 0: { breeding: { card: "EX1-005", as: "host", under: ["BT1-010"], dp: 4000 } } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
