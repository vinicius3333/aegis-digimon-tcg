import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-067.js";

describe("EX1-067 Baptism by Fire!", () => {
  it("deletes an opposing Digimon with Blocker and 6000 DP or less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-067", as: "option" }],
          battleArea: [{ card: "BT1-009", as: "redSource" }],
        },
        1: {
          battleArea: [
            { card: "BT1-072", as: "eligibleBlocker" },
            { card: "BT2-072", as: "tooLargeBlocker", dp: 7000 },
            { card: "BT1-064", as: "nonBlocker", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const eligibleId = s.perm("eligibleBlocker").topCard.instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.trash.some((card) => card.instanceId === eligibleId));

    expect(p1.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooLargeBlocker").permanentId,
      s.perm("nonBlocker").permanentId,
    ]);
  });

  it("activates the same deletion effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX1-067", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
      },
      { autoSelectCards: true },
    );
    const blockerId = s.perm("blocker").topCard.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === blockerId)).toBe(true);
  });

  it("activates Main and deletes an eligible Blocker during a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-072", as: "blocker" },
          ],
        },
        1: { security: [{ card: "EX1-067", as: "option" }] },
      },
      { autoSelectCards: true },
    );
    const blockerId = s.inst("blocker").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === blockerId));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === blockerId)).toBe(true);
  });
});
