import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-060.js";
import "../index.js";

describe("EX5-060 Dragomon", () => {
  it("plays a suspended opposing level 4 or lower Digimon from trash without its On Play effects", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      controller: "opponent",
      suspended: true,
      from: ["trash"],
      suppressOnPlayEffects: true,
      target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3, 4] } },
    });
  });
  it("revives one of your purple Digimon from trash when an opponent plays a Digimon and inherits Piercing", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], byEffect: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: {
                count: 1,
                filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levelLteTriggerSource: true },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Piercing");
  });

  it("plays an opposing level-4 card suspended from trash without activating its On Play effects", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-060", as: "source" }] },
        1: { trash: [{ card: "EX5-056", as: "candidate" }], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX5-056"));
    const candidate = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "EX5-056")!;
    expect(candidate.isSuspended).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("optionally plays a purple Digimon no higher than the effect-played opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-060", as: "source" },
            { card: "BT14-072", as: "host", under: ["EX5-060"] },
          ],
          trash: ["BT10-073", "BT10-074"],
        },
        1: { hand: [{ card: "BT1-009", as: "played" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("played").instanceId], "EX5-060");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT10-073"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT10-073")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-074")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });
});
