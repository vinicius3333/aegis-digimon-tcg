import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-099.js";
import "./index.js";

describe("BT20-099 Singularity of Chaos", () => {
  it("encodes the ACCEL play reduction directly", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 4, optional: true },
        { kind: "PlaceUnder", position: "bottom", underFilter: { controller: "mine", kind: ["Digimon"] } },
      ],
    });
    expect(main?.actions.some((action) => action.kind === "Replacement")).toBe(false);
    expect(main?.actions[1]?.optional).not.toBe(true);
  });

  it("keeps the color waiver scoped to Chaosmon or ACCEL", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: {
              nameOrTrait: [
                { tokens: ["Chaosmon"], match: "name" },
                { tokens: ["ACCEL"], match: "trait" },
              ],
            },
          },
        },
      ],
    });
  });

  it("marks the printed Security memory-and-hand effect as Security-resident", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "GainMemory", amount: 1 }, { kind: "AddToHandSelf" }],
    });
  });

  it("keeps the end-of-opponent-turn Chaosmon clause inherited rather than Security-only", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfOpponentsTurn");
    expect(inherited).toMatchObject({ isInherited: true });
    expect(inherited?.isSecurity).not.toBe(true);
  });

  it("naturally plays an ACCEL Digimon for the reduced cost and places this card underneath it", async () => {
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: [] as string[],
    };
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-099", as: "option" },
            { card: "BT20-030", as: "liollmon" },
          ],
          battleArea: ["BT20-092", "BT4-090"],
          deck: ["BT1-010"],
        },
      },
      options,
    );
    const optionId = s.inst("option").instanceId;
    const liollmonId = s.inst("liollmon").instanceId;
    options.preferInstanceIds.push(liollmonId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard.instanceId === liollmonId && permanent.stack.some((card) => card.instanceId === optionId),
      ),
    );

    const playedAccel = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === liollmonId);
    expect(playedAccel).toBeDefined();
    expect(playedAccel!.topCard.cardId).toBe("BT20-030");
    expect(playedAccel!.stack.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.memory).toBe(1);
  });

  it("resolves the inherited Chaosmon end-of-opponent-turn security trash and DP reduction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-090", as: "chaosmon", dp: 40000, under: ["BT20-099"] }],
        security: ["BT1-010"],
      },
      1: { security: ["BT1-010"], deck: ["BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.EndOfOpponentsTurn, s.perm("chaosmon"));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.perm("chaosmon").currentDP).toBe(10000);
  });
});
