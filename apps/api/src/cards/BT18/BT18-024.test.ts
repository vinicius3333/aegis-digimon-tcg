import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-024.js";

describe("BT18-024 Calmaramon", () => {
  it("returns an opponent level 4 when its own stack contains a level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-024", as: "calmaramon", under: ["BT1-030"] }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("calmaramon").topCard!);
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === targetId)).toBe(false);
  });

  it("uses the inherited once-per-turn attack effect to return an exact level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "calmaramon", under: ["BT18-024"] }] },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("calmaramon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === targetId)).toBe(false);
  });
});
