import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-084.js";

describe("BT13-084 Astamon", () => {
  it("may digivolve into a Belphemon in hand by deleting another purple Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        payCost: false,
        from: ["hand"],
        optional: true,
        into: { nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] },
        cost: {
          kind: "deleteOwn",
          target: {
            filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], colors: ["Purple"] },
            count: 1,
          },
        },
      });
    }
  });

  it("inherits a once-per-turn trash-from-hand watcher that plays a level 4 or lower purple Digimon", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              optional: true,
              payCost: false,
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple"],
                  levelComparison: { op: "lte", value: 4 },
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("deletes another purple Digimon and digivolves into Belphemon from hand", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-083", as: "cost" }],
          hand: [
            { card: "BT13-084", as: "astamon" },
            { card: "BT13-088", as: "sleep" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("cost").permanentId);
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("astamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-088"));
    expect(s.perm("astamon").topCard?.cardId).toBe("BT13-088");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-083")).toBe(true);
  });

  it("can decline the optional Belphemon digivolution without deleting the other Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-084", as: "astamon" },
            { card: "BT13-083", as: "cost" },
          ],
          hand: [{ card: "BT13-088", as: "sleep" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("astamon"));
    expect(s.perm("astamon").topCard?.cardId).toBe("BT13-084");
    expect(s.perm("cost").topCard?.cardId).toBe("BT13-083");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-088")).toBe(true);
  });

  it("plays a level 4 purple Digimon from trash after an inherited host sees a hand trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-084"] }],
          hand: [{ card: "BT1-001", as: "discard" }],
          trash: [{ card: "BT13-080", as: "rescue" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).subscriptions("whenTrashedFromHand", s.perm("host").permanentId)).toHaveLength(1);
    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-080"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-080")).toBe(true);
  });
});
