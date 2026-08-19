import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, type PlayerState } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "./testkit/harness.js";

// Boot the real card registry. The cases below intentionally use card IDs from the
// catalogued decks, rather than hand-built effect modules or synthetic eggs.
import "../cards/index.js";

const HATCH_EGGS = ["BT1-001", "BT15-004", "BT16-003"] as const;

function fireTiming(s: EngineSetup, timing: EffectTiming): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(timing: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing);
}

describe("catalogued Digi-Egg behavior — public breeding hatch", () => {
  it.each(HATCH_EGGS)("hatches the real %s through hatchEgg in the Breeding phase", async (eggId) => {
    const s = setupEngine({ 0: { eggDeck: [{ card: eggId, as: "egg" }] } });
    const player = s.state.players[0] as PlayerState;
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => player.breeding?.topCard?.cardId === eggId);

    expect(player.breeding?.topCard?.cardId).toBe(eggId);
    expect(player.breeding?.inBreeding).toBe(true);
    expect(player.breeding?.topCard?.faceUp).toBe(true);
    expect(player.eggDeck).toHaveLength(0);
    assertNoLoudGap(s);
  });
});

describe("catalogued Digi-Egg behavior — inherited effects on a battle-area host", () => {
  it("BT1-001 gives its host +1000 DP when that host attacks a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-001", dp: 5000, as: "host", under: [{ card: "BT1-001", as: "egg" }] }],
      },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, suspended: true, as: "defender" }] },
    });
    const host = s.perm("host");
    const defender = s.perm("defender");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === defender.permanentId));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true);
    expect(s.perm("host").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });

  it("BT15-004 lets an Insectoid host attack at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-066", dp: 4000, as: "host", under: [{ card: "BT15-004", as: "egg" }] }],
          security: ["BT1-085", "BT1-085"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, suspended: true, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("catalogued Digi-Egg behavior — breeding isolation", () => {
  it("does not fire BT15-004's inherited battle effect while the egg is in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT15-004", as: "egg" },
        security: ["BT1-085", "BT1-085"],
      },
      1: { battleArea: [{ card: "BT1-009", dp: 3000, suspended: true, as: "defender" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => false, 40);

    expect(s.perm("egg").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-004");
    assertNoLoudGap(s);
  });
});
