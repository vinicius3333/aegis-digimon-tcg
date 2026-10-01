import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT8-066.js";
import "./BT8-092.js";

describe("BT8-066 Hisyaryumon", () => {
  it("keeps the effect-driven X-Antibody digivolution requirements and cost reduction explicit", () => {
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true, byEffect: true },
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          costDelta: -1,
          ignoreReqs: false,
          into: { filter: { nameOrTrait: [{ match: "trait", tokens: ["X-Antibody"] }] } },
        },
      ],
    });
  });

  it("gives Reboot to an X-Antibody host on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-069", as: "host", under: ["BT8-066"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("digivolves for 1 less after Yuji places a digivolution card under it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-092", as: "yuji" },
            { card: "BT8-066", as: "hisyaryumon" },
          ],
          hand: [
            { card: "BT8-060", as: "placed" },
            { card: "BT8-069", as: "ouryumon" },
          ],
        },
        1: { security: ["BT8-034"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("placed").instanceId, s.inst("ouryumon").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hisyaryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hisyaryumon").topCard.instanceId === s.inst("ouryumon").instanceId);

    expect(s.perm("yuji").isSuspended).toBe(true);
    expect(s.perm("hisyaryumon").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.perm("hisyaryumon").topCard.instanceId).toBe(s.inst("ouryumon").instanceId);
    expect(s.state.memory).toBe(2);
  });
});

describe("BT8-066 Hisyaryumon — KB Q&A rulings", () => {
  it("cannot ignore digivolution requirements when digivolving into an X-Antibody card (Q1748)", async () => {
    async function attackWithYujiHolding(targetCardId: string) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT8-092", as: "yuji" },
              { card: "BT8-066", as: "hisyaryumon" },
            ],
            hand: [
              { card: "BT8-060", as: "placed" },
              { card: targetCardId, as: "digivolveTarget" },
            ],
          },
          1: { security: ["BT8-034"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("placed").instanceId);
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("hisyaryumon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("hisyaryumon").stack.some((card) => card.instanceId === s.inst("placed").instanceId));
      await drainMicrotasks();
      return s;
    }

    const levelFiveDoruGreymon = await attackWithYujiHolding("BT7-064");
    expect(levelFiveDoruGreymon.perm("hisyaryumon").topCard.cardId).toBe("BT8-066");
    expect(levelFiveDoruGreymon.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT7-064"]);

    const levelSixOuryumon = await attackWithYujiHolding("BT8-069");
    expect(levelSixOuryumon.perm("hisyaryumon").topCard.cardId).toBe("BT8-069");
  });
});
