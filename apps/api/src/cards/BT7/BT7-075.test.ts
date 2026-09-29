import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-075.js";

describe("BT7-075 Rhihimon", () => {
  it("reduces its digivolution cost by 2 when the base has a Tamer source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-071", under: ["BT7-091"], as: "base" }],
        hand: [{ card: "BT7-075", as: "rhihimon" }],
        deck: ["BT7-072"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rhihimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT7-075" && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT7-075");
  });

  it("plays the purple Tamer from its own deleted stack when it has a Hybrid source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-075",
              under: [
                { card: "BT7-071", as: "hybrid" },
                { card: "BT3-096", as: "tamer" },
              ],
              as: "rhihimon",
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("rhihimon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
  });
});

describe("BT7-075 Rhihimon — KB Q&A rulings", () => {
  const attackIntoLargerDigimon = async (tamerCard: string) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-075",
              as: "rhihimon",
              under: [
                { card: "BT7-071", as: "hybrid" },
                { card: tamerCard, as: "tamer" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const rhihimonInstanceId = s.perm("rhihimon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rhihimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === rhihimonInstanceId) &&
        s.state.pendingDecision === undefined,
    );
    const tamerInPlay = s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("tamer").instanceId,
    );
    return { s, tamerInPlay };
  };

  it("plays the purple Tamer that was in its own digivolution cards from the trash for free when deleted (Q1641)", async () => {
    const purple = await attackIntoLargerDigimon("BT3-096");
    expect(purple.tamerInPlay).toBe(true);
    expect(purple.s.state.memory).toBe(2);
    expect(
      purple.s.state.players[0]!.trash.some((card) => card.instanceId === purple.s.inst("hybrid").instanceId),
    ).toBe(true);

    const red = await attackIntoLargerDigimon("BT7-085");
    expect(red.tamerInPlay).toBe(false);
    expect(red.s.state.players[0]!.trash.some((card) => card.instanceId === red.s.inst("tamer").instanceId)).toBe(true);
  });
});
