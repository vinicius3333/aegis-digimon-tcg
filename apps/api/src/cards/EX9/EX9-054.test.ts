import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX9-054.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-054", () => {
  it("de-digivolves one on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [{ kind: "DeDigivolve", amount: 1 }],
      });
  });
  it("plays a Negamon-text Digimon from hand on deletion with a level limit scaled by Negamon cards", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0] as any;
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      target: { filter: { levelComparison: { op: "lte", value: 4 } } },
    });
    expect(action?.target?.filter?.nameOrTrait).toContainEqual({ tokens: ["Negamon"], match: "text" });
  });
  it("scales the optional deletion play limit by every two exact named Negamon cards in trash or stacks", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      optional: true,
      from: ["hand"],
      payCost: false,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
          levelComparison: {
            op: "lte",
            value: 4,
            scaling: {
              per: 2,
              unit: "cards",
              filter: {
                zone: ["trash", "digivolutionCards"],
                controller: "mine",
                kind: ["Digimon", "DigiEgg"],
                nameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
              },
            },
          },
        },
      },
    }));
  it("inherits once-per-turn unsuspend when an Abbadomon attack target switches", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "Unsuspend" }] }],
    }));
  it("plays a qualifying Negamon-text Digimon from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-054", as: "source" }], hand: ["EX9-047"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047"));

    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-047")).toBe(true);
    expect(player.hand.some((card) => card.cardId === "EX9-047")).toBe(false);
  });

  it("raises the level maximum for exact named Negamon cards, including Digi-Eggs", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-054", as: "source" }],
          hand: [{ card: "EX9-054", as: "candidate" }],
          trash: ["EX9-005", "EX9-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("candidate").instanceId));

    expect(player.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(false);
  });

  it("does not raise the level maximum for cards that only mention Negamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-054", as: "source" }],
          hand: [{ card: "EX9-054", as: "candidate" }],
          trash: ["EX9-047", "EX9-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });
});
