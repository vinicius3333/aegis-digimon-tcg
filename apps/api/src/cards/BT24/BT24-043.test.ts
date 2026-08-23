import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_043 } from "./BT24-043.js";
import "../index.js";

describe("BT24-043 Tapirmon", () => {
  it("reveals three and searches the two printed pools", () => {
    const onPlay = BT24_043.effects?.find((entry) => entry.trigger === "OnPlay");
    const reveal = onPlay?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
    expect(reveal.add[0]).toMatchObject({ to: "hand", filter: { kind: ["Digimon"] } });
    expect(reveal.add[1]).toMatchObject({ to: "hand", filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } });
    expect(BT24_043.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
    });
  });

  it("adds a trait containing Beast and a TS card while bottoming a Sea Animal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-043", as: "tapirmon" }],
          deck: [
            { card: "BT1-046", as: "beast" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-033", as: "seaAnimalMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("beast").instanceId, s.inst("ts").instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tapirmon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("beast").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("seaAnimalMiss").instanceId]);
  });

  it("inherited suspension affects one opponent Digimon only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-043"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
  });

  it("digivolves from a non-green level-2 TS egg for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "egg" },
        hand: [{ card: "BT24-043", as: "tapirmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tapirmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("tapirmon").instanceId);
    expect(s.state.memory).toBe(3);
  });
});
