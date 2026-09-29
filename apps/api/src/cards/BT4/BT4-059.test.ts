import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-052.js";
import "./BT4-059.js";

describe("BT4-059 Lilamon", () => {
  it("Digi-Bursts 2 to suspend an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-059", as: "lila", under: ["BT4-004", "BT4-052", "BT4-054"] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.perm("lila"))).find(
      (effect) => effect.effectKey.startsWith("BT4-059/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lila").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("lila").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-052")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("suspends an opposing Digimon when its host attacks while you have any Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT4-060",
              as: "host",
              under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"],
            },
            { card: "BT1-086" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon from its inherited effect without a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT4-060",
            as: "host",
            under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"],
          },
        ],
      },
      1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.perm("target").isSuspended).toBe(false);
  });
});

describe("BT4-059 Lilamon — KB Q&A rulings", () => {
  async function attackWithInheritedLilamon(tamers: string[]): Promise<boolean> {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-060", as: "host", under: ["BT4-004", "BT4-052", "BT4-054", "BT4-059"] }, ...tamers],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);
    return s.perm("target").isSuspended;
  }

  it("activates its inherited effect with a Tamer of any color (Q1215)", async () => {
    const redTamer = "BT1-085";
    const yellowTamer = "BT1-087";
    const greenTamer = "BT1-089";

    expect(await attackWithInheritedLilamon([redTamer])).toBe(true);
    expect(await attackWithInheritedLilamon([yellowTamer])).toBe(true);
    expect(await attackWithInheritedLilamon([greenTamer])).toBe(true);
    expect(await attackWithInheritedLilamon([])).toBe(false);
  });
});
