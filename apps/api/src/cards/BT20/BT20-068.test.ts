import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-068.js";
import "./index.js";

describe("BT20-068 Bakemon", () => {
  it("optionally plays Violet Inboots from hand when there is at most one own Tamer", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand"],
          payCost: false,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Violet Inboots"], match: "name" }] },
            count: 1,
          },
          condition: { kind: "permanentCount", seat: "mine", filter: { kind: ["Tamer"] }, op: "lte", value: 1 },
        },
      ],
    });
  });

  it("inherits On Deletion gain 1 memory", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("publishes the printed stats and purple evolution route", () => {
    expect(getCardDefinition("BT20-068")).toMatchObject({
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
  });

  it("free-plays Violet on evolution at the exact 0/1-Tamer boundary, but not with 2", async () => {
    for (const tamerCount of [0, 1, 2]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-063", as: "base" },
              ...Array.from({ length: tamerCount }, (_, index) => ({ card: "BT20-085", as: `tamer${index}` })),
            ],
            hand: [
              { card: "BT20-068", as: "bakemon" },
              { card: "BT20-088", as: "violet" },
            ],
            deck: ["BT20-047"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("bakemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        tamerCount <= 1
          ? s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-088")
          : s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT20-068"),
      );
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-088")).toBe(
        tamerCount <= 1,
      );
      expect(s.state.memory).toBe(0);
    }
  });

  it("allows the free Violet play to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", as: "base" }],
          hand: [
            { card: "BT20-068", as: "bakemon" },
            { card: "BT20-088", as: "violet" },
          ],
          deck: ["BT20-047"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-068");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("violet").instanceId);
  });

  it("gains 1 memory only when Bakemon is inherited under the deleted host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-069", under: ["BT20-068"], as: "host" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(s.state.memory).toBe(1);
  });
});
