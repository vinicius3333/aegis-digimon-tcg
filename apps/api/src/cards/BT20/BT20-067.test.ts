import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-067.js";
import "./index.js";

describe("BT20-067 Soulmon", () => {
  it("grants one own Digimon Retaliation on play and digivolving through the opponent's turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Retaliation" },
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }
  });

  it("inherits the costed hand-trash deletion effect", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
        },
      ],
    });
  });

  it("publishes the printed stats and purple evolution route", () => {
    expect(getCardDefinition("BT20-067")).toMatchObject({
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
  });

  it("on play and evolution grants one chosen ally live Retaliation", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-061", as: "ally" },
              ...(mode === "digivolve" ? [{ card: "BT20-063", as: "base" }] : []),
            ],
            hand: [{ card: "BT20-067", as: "soulmon" }],
            deck: ["BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 4;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("soulmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("soulmon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation"));
      expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    }
  });

  it("when inherited, pays one hand card to delete level 4 while preserving level 5", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-068", under: ["BT20-067"], as: "host" }],
          hand: [{ card: "BT20-047", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-066", as: "level4" },
            { card: "BT20-071", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.perm("level4").permanentId);
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-071"]);
  });
});
