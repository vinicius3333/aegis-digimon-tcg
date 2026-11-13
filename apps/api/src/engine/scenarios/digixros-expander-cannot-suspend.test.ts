import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

const TAIKI = "BT19-079";
const XROS = "BT10-009";
const SHOUTMON = "BT10-008";
const FILLER = ["BT1-009", "BT1-010", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-012", "BT1-013"];

async function setupTaikiWithMaterial(restricted: boolean) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: TAIKI, as: "taiki", under: [{ card: SHOUTMON, as: "under" }] }],
        hand: [{ card: XROS, as: "xros" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 9;
  await s.ready();
  if (restricted) {
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("taiki").permanentId,
      "suspend",
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();
  }
  return s;
}

describe("DigiXros expander Tamer that can't suspend", () => {
  it("rejects under-Tamer materials when the expander is locked by a can't-suspend effect", async () => {
    const s = await setupTaikiWithMaterial(true);
    const underId = s.inst("under").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [s.perm("taiki").permanentId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-expander" });
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS)).toBe(false);
    expect(s.perm("taiki").stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.state.memory).toBe(9);
  });

  it("still lets an unrestricted expander pay its suspension cost", async () => {
    const s = await setupTaikiWithMaterial(false);
    const underId = s.inst("under").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [s.perm("taiki").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === XROS));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === XROS);
    expect(played?.stack.map((c) => c.instanceId)).toEqual([underId]);
    expect(s.perm("taiki").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
