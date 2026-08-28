import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-107.js";
import "../BT4/BT4-088.js";
import "../BT4/BT4-097.js";
import "./BT2-020.js";

describe("BT2-020 Gallantmon", () => {
  it("deletes a 6000 DP Digimon with a red Tamer in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085" }, { card: "BT2-017", as: "base" }],
          hand: [{ card: "BT2-020", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete without an allied red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086" }, { card: "BT2-017", as: "base" }],
          hand: [{ card: "BT2-020", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-047", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-020");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete a 6001 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085" }, { card: "BT2-017", as: "base" }],
          hand: [{ card: "BT2-020", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-047", dp: 6001 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-020");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("trashes 1 opposing security card for every 10 cards in their trash when attacking", async () => {
    const trash = Array.from({ length: 20 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-020", as: "gallantmon" }] },
      1: { trash, security: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gallantmon"));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Q999 directly trashes security without activating its Security effect", async () => {
    const trash = Array.from({ length: 10 }, () => "BT1-010");
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-020", as: "gallantmon" }] },
      1: {
        deck: ["BT1-011"],
        trash,
        security: [{ card: "BT1-107", as: "holyWave", faceUp: true }],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gallantmon"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("holyWave").instanceId)).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("Q1000 wins when the attack continues after trashing the opponent's last security", async () => {
    const trash = Array.from({ length: 10 }, () => "BT1-010");
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-020", as: "gallantmon" }] },
      1: { trash, security: ["BT1-011"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.gameOver);
    expect(s.state.winnerSeat).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("Q1239 and Q1251 fire security-removal watchers when Gallantmon directly trashes security", async () => {
    const trash = Array.from({ length: 10 }, () => "BT1-010");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-020", as: "gallantmon" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT4-088", as: "danDevimon" },
            { card: "BT4-097", as: "kari" },
          ],
          trash,
          security: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gallantmon"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-1);
  });
});
