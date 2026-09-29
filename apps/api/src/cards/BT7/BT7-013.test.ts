import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST1/ST1-15.js";
import "./BT7-013.js";

describe("BT7-013 MetalGreymon", () => {
  it("gains only 1 memory per turn when an opposing Digimon is deleted as an inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-014", under: ["BT7-013"], as: "host" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-014", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");

    expect(s.state.memory).toBe(1);
  });

  it("gains two memory when its owner has a Tamer in play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT7-013", as: "source" }], battleArea: [{ card: "BT7-085", as: "tamer" }] },
    });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("Q1514 plays a red Tamer for free instead of gaining memory when none is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-013", as: "source" },
            { card: "BT7-085", as: "takuya" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("takuya").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });
});

describe("BT7-013 MetalGreymon — KB Q&A rulings", () => {
  it("gains only 1 memory when one effect deletes 2 opposing Digimon at the same time (Q1515)", async () => {
    const memoryAfterGigaDestroyer = async (
      hostSources: string[],
    ): Promise<{ memory: number; metalGreymonTriggers: number }> => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-014", under: hostSources, as: "host" }],
            hand: [{ card: "ST1-15", as: "gigaDestroyer" }],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "first" },
              { card: "BT1-014", as: "second" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gigaDestroyer").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      await settle();

      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      const metalGreymonTriggers = s.events.filter(
        (event) => event.kind === "effectTriggered" && event.effectKey.includes("BT7-013/"),
      ).length;
      return { memory: s.state.memory, metalGreymonTriggers };
    };

    // [Once Per Turn] caps the memory total anyway, so the resolved MetalGreymon activations are counted too.
    expect(await memoryAfterGigaDestroyer(["BT7-013"])).toEqual({ memory: 1, metalGreymonTriggers: 1 });
    expect(await memoryAfterGigaDestroyer(["BT7-011"])).toEqual({ memory: 0, metalGreymonTriggers: 0 });
  });
});
