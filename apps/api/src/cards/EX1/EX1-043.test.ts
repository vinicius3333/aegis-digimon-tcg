import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-043.js";

describe("EX1-043 HerculesKabuterimon", () => {
  it("gets +1000 DP per Insectoid source in a legal evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-043", as: "hercules", dp: 12000, under: ["BT1-070", "EX1-040"] }],
      },
    });
    await s.ready();
    expect(s.perm("hercules").currentDP).toBe(14000);
  });

  it("counts only Insectoid cards in a legal level 3-to-6 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-043", as: "hercules", dp: 12000, under: ["BT1-067", "BT1-071", "EX1-040"] }],
      },
    });
    await s.ready();

    expect(s.perm("hercules").currentDP).toBe(13000);
  });

  it("unsuspends after an Insectoid deletes an opponent in a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-043", as: "hercules", suspended: true },
            { card: "EX1-040", as: "insectoid" },
          ],
        },
        1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 4000 }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("insectoid").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("hercules").isSuspended);
    expect(s.perm("hercules").isSuspended).toBe(false);
  });

  it("unsuspends after an Ancient Insect deletes an opponent in a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-043", as: "hercules", suspended: true },
            { card: "BT7-054", as: "ancient" },
          ],
        },
        1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 4000 }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancient").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("hercules").isSuspended);
    expect(s.perm("hercules").isSuspended).toBe(false);
  });

  it("does not unsuspend after a non-Insectoid deletes an opponent in a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-043", as: "hercules", suspended: true },
            { card: "BT1-009", as: "nonInsectoid" },
          ],
        },
        1: { battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nonInsectoid").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("hercules").isSuspended).toBe(true);
  });

  it("unsuspends at most once per turn through successive real battles", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-043", as: "hercules", suspended: true },
            { card: "EX1-040", as: "insectoid" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-070", as: "firstTarget", suspended: true, dp: 4000 },
            { card: "BT1-070", as: "secondTarget", suspended: true, dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("insectoid").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !s.perm("hercules").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hercules").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("hercules").isSuspended);
    expect(s.perm("hercules").isSuspended).toBe(true);
  });

  it("resets its once-per-turn unsuspend trigger on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-043", as: "hercules", suspended: true },
            { card: "EX1-040", as: "firstAttacker" },
            { card: "EX1-040", as: "secondAttacker" },
            { card: "EX1-040", as: "thirdAttacker" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-070", as: "firstTarget", suspended: true, dp: 4000 },
            { card: "BT1-070", as: "secondTarget", suspended: true, dp: 4000 },
            { card: "BT1-070", as: "thirdTarget", suspended: true, dp: 4000 },
            { card: "BT1-070", as: "fourthTarget", suspended: true, dp: 4000 },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("hercules").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hercules").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.perm("hercules").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("thirdTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("fourthTarget").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("fourthTarget").isSuspended);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("thirdAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("fourthTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("hercules").isSuspended);
    expect(s.perm("hercules").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
