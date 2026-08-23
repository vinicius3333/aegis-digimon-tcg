import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-011.js";
import "./P-012.js";
import "./P-047.js";
import "./P-048.js";

describe("Veedramon Zero promo deck", () => {
  it("combines Tai, BT1 SEC Veedramon, Zero's mill boost, and its inherited recycle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-011", as: "zero" },
            { card: "BT1-115", as: "secVeedramon" },
            { card: "BT2-028", as: "aero", under: ["P-011"] },
            { card: "P-012", as: "tai" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", { card: "BT1-004", as: "drawn" }],
          trash: ["BT1-009", "BT1-086", "BT1-094"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true, dp: 1000 },
            { card: "BT1-010", as: "secondTarget", suspended: true, dp: 1000 },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoSelectCards: true,
        autoOrderCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("secVeedramon").permanentId);
    const secBaseDP = s.perm("secVeedramon").baseDP;
    const zeroBaseDP = s.perm("zero").baseDP;
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "P-012/main",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secVeedramon").currentDP === secBaseDP + 1000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zero").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zero").currentDP === zeroBaseDP + 2000 && s.state.players[0]!.trash.length === 6);
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aero").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.perm("tai").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
  });

  it("chains Aero Zero under Ulforce Zero with one memory trigger across both recycle effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-047", as: "aero", suspended: true },
            { card: "P-012", as: "tai", suspended: true },
          ],
          hand: [{ card: "P-048", as: "ulforce" }],
          deck: [{ card: "BT1-009", as: "digivolveDraw" }],
          trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aero").permanentId,
        instanceId: s.inst("ulforce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("aero").isSuspended && !s.perm("tai").isSuspended && s.state.memory === 1);
    const ulforceBaseDp = s.perm("aero").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aero").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 0 && s.perm("aero").currentDP === ulforceBaseDp + 2000);

    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.memory).toBe(1);
    expect(s.perm("aero").currentDP).toBe(ulforceBaseDp + 2000);
  });
});
