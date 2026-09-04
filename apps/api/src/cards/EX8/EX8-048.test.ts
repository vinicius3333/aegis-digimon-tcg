import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { EffectTiming, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-048.js";

describe("EX8-048", () => {
  function primitivesOf(s: EngineSetup): Primitives {
    return (s.engine as unknown as { primitives: Primitives }).primitives;
  }

  it("inherits deletion of an opposing play-cost-4-or-less Digimon when trashed from a Mineral/Rock host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardsDiscardedBatch",
      sourceFilter: { isSelfRef: true },
      hostFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
      actions: [{ kind: "Delete", target: { filter: { playCostLte: 4 } } }],
    }));

  it("plays Close from hand when digivolving with one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "youHave", filter: { countMax: 1 } },
    }));
  it("plays Close from hand without cost when the digivolving condition is met", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "base" }],
          hand: [
            { card: "EX8-048", as: "source" },
            { card: "EX8-067", as: "close" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067")).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("close").instanceId)).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("keeps Close in hand when the optional When Digivolving play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "base" }],
          hand: [
            { card: "EX8-048", as: "source" },
            { card: "EX8-067", as: "close" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX8-048");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("close").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not play Close when its controller has two Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-048", as: "source" },
            { card: "BT1-087", as: "one" },
            { card: "EX8-067", as: "two" },
          ],
          hand: [{ card: "EX8-067", as: "close" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("close").instanceId)).toBe(true);
  });

  it("deletes an opposing low-cost Digimon when trashed from a qualifying host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-048", as: "host", under: [{ card: "EX8-048", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await s.ready();
    await primitivesOf(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("discarded").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });

  it("does not trigger the inherited deletion from a non-Mineral/Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: [{ card: "EX8-048", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await s.ready();
    await primitivesOf(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("discarded").instanceId], {
      byEffectSeat: 0,
    });
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(1);
  });
});
