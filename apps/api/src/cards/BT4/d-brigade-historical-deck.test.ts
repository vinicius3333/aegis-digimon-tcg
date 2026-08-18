import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-063.js";
import "./BT4-071.js";
import "./BT4-074.js";
import "./BT4-110.js";

describe("BT4 D-Brigade historical deck gauntlet", () => {
  it("turns a deletion into a free Commandramon, reloads the deck with Darkdramon, then scales Dark Roar", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-071", as: "tankdramon" },
            { card: "BT4-063", as: "deletedBrigade" },
          ],
          hand: [
            { card: "BT4-074", as: "darkdramon" },
            { card: "BT4-110", as: "darkRoar" },
          ],
          deck: [
            { card: "BT4-063", as: "revealedCommandramon" },
            { card: "BT1-009", as: "revealedRest" },
            { card: "BT1-010", as: "existingDeck" },
          ],
          trash: [{ card: "BT3-059", as: "oldCommandramon" }],
        },
        1: { battleArea: [{ card: "BT4-069", as: "costSixTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const deletedBrigade = s.perm("deletedBrigade");
    const deletedId = deletedBrigade.permanentId;
    const deletedInstanceId = deletedBrigade.topCard!.instanceId;

    await (s.engine as unknown as {
      primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<void> };
    }).primitives.deletePermanent([deletedId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("revealedCommandramon").instanceId,
    ));

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("darkdramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("oldCommandramon").instanceId) &&
      s.state.players[0]!.deck.some((card) => card.instanceId === deletedInstanceId) &&
      s.state.memory === 1
    );

    const darkdramon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("darkdramon").instanceId,
    );
    expect(darkdramon).toBeDefined();
    expect(observe(s.engine).hasKeyword(darkdramon!, "Rush")).toBe(true);
    expect(s.state.memory).toBe(1);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("darkRoar").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.length === 0 &&
      s.state.players[0]!.trash.some((card) => card.cardId === "BT4-110")
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT4-110")).toBe(true);
  });
});
