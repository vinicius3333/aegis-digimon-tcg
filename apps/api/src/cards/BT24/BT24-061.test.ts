import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_061 } from "./BT24-061.js";
import "../index.js";

describe("BT24-061 Vademon", () => {
  it("returns a low-play-cost opponent Digimon or Tamer to deck top", () => {
    const effects = BT24_061.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "deckTop",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 3 }, count: 1 },
      });
    }
    const inherited = BT24_061.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
  });

  it("returns only a play-cost-3-or-lower opponent card to deck top", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-061", as: "vademon" }] },
        1: {
          battleArea: [
            { card: "BT1-088", as: "low" },
            { card: "BT24-102", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("high").topCard.instanceId, s.perm("low").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("vademon"));

    expect(s.state.players[1]!.deck[0]!.instanceId).toBe(s.inst("low").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("high").instanceId,
    );
  });

  it("digivolves from a level-4 TS Digimon for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-046", as: "ts" }],
        hand: [{ card: "BT24-061", as: "vademon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ts").permanentId,
        instanceId: s.inst("vademon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ts").topCard.instanceId === s.inst("vademon").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("inherited De-Digivolve 1 activates only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-062", as: "host", under: ["BT24-061"] }] },
        1: {
          battleArea: [
            { card: "BT24-051", as: "first", under: ["BT24-050"] },
            { card: "BT24-051", as: "second", under: ["BT24-050"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("first").topCard.cardId).toBe("BT24-050");
    expect(s.perm("second").topCard.cardId).toBe("BT24-051");
  });
});
