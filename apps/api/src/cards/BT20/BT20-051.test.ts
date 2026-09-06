import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-051.js";
import "./index.js";

describe("BT20-051 Raptordramon", () => {
  it("optionally plays Kota Domoto when there is at most one own Tamer", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand"],
          payCost: false,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Kota Domoto"], match: "nameExact" }] },
            count: 1,
          },
          condition: { kind: "permanentCount", seat: "mine", filter: { kind: ["Tamer"] }, op: "lte", value: 1 },
        },
      ],
    });
  });

  it("grants inherited +2000 DP during the opponent's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("plays Kota at zero or one Tamer but not at two across both alternate routes", async () => {
    for (const [base, tamers, shouldPlay] of [
      ["BT20-048", [], true],
      ["BT20-010", ["BT20-088"], true],
      ["BT20-048", ["BT20-088", "BT20-089"], false],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }, ...tamers.map((card, index) => ({ card, as: `tamer${index}` }))],
            hand: [
              { card: "BT20-051", as: "raptor" },
              { card: "BT7-090", as: "kota" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("raptor").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-051");
      await settle(
        () => shouldPlay === s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT7-090"),
      );
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT7-090")).toBe(
        shouldPlay,
      );
    }
  });

  it("allows the optional Kota play to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-048", as: "base" }],
          hand: [
            { card: "BT20-051", as: "raptor" },
            { card: "BT7-090", as: "kota" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raptor").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-051");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kota").instanceId)).toBe(true);
  });

  it("grants its inherited host +2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-053", dp: 7000, under: ["BT20-051"], as: "host" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("does not treat the Kota Domoto & Yuji Musya variant as exact Kota Domoto", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-048", as: "base" }],
          hand: [
            { card: "BT20-051", as: "raptor" },
            { card: "BT20-087", as: "variant" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raptor").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-051" && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("variant").instanceId)).toBe(true);
  });
});
