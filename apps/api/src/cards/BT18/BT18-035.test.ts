import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-035.js";

describe("BT18-035 Piddomon", () => {
  it("plays this exact security card without cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT18-035", as: "piddomon", faceUp: true }] } });
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("piddomon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("piddomon").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("piddomon").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("piddomon").instanceId)).toBe(false);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("digivolves from a yellow level 3 for 2 and preserves that source beneath Piddomon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-034", as: "lucemon" }],
        hand: [{ card: "BT18-035", as: "piddomon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lucemon").permanentId,
        instanceId: s.inst("piddomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lucemon").topCard?.instanceId === s.inst("piddomon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-034"]);
    assertNoLoudGap(s);
  });

  it("reduces exactly one opposing Digimon by 2000 only on the host's first attack of the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-035"] }] },
        1: {
          security: ["BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-030", as: "target", dp: 4000 },
            { card: "BT1-030", as: "untargeted", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ currentDP }) => currentDP === 2000));

    expect(s.state.players[1]!.battleArea.map(({ currentDP }) => currentDP).sort()).toEqual([2000, 4000]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.reduce((total, permanent) => total + permanent.currentDP, 0)).toBe(6000);
    assertNoLoudGap(s);
  });
});
