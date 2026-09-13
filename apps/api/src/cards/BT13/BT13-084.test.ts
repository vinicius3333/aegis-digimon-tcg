import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-084.js";
import "./BT13-078.js";
import "./BT13-081.js";
import "./BT13-088.js";
import "../BT2/BT2-073.js";

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

  it("plays only once per opponent turn and resets through natural hand-trash events", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT13-088",
              as: "host",
              under: [
                { card: "BT13-078", as: "sourcePhascomon" },
                { card: "BT13-081", as: "sourcePorcupamon" },
                { card: "BT13-084", as: "sourceAstamon" },
              ],
            },
          ],
          hand: ["BT1-010", "BT1-011"],
          trash: [
            { card: "BT2-073", as: "firstVilemon" },
            { card: "BT2-073", as: "secondVilemon" },
          ],
          deck: [
            { card: "BT1-010", as: "firstDrawOne" },
            { card: "BT1-011", as: "firstDrawTwo" },
            { card: "BT1-012", as: "betweenDraw" },
            { card: "BT1-010", as: "nextDrawOne" },
            { card: "BT1-011", as: "nextDrawTwo" },
            "BT1-012",
            "BT1-010",
            "BT1-011",
          ],
        },
        1: {
          hand: ["BT1-010"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-010", "BT1-011", "BT1-012", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstVilemon").instanceId, s.inst("secondVilemon").instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstOwn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstVilemon").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("secondVilemon").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("sourcePhascomon").instanceId,
        s.inst("sourcePorcupamon").instanceId,
        s.inst("sourceAstamon").instanceId,
      ]),
    );
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondVilemon").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.perm("host").stack.map((c) => c.instanceId)).toContain(s.inst("sourceAstamon").instanceId);
  });
});
