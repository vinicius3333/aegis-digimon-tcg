import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-094.js";
import "./index.js";
import "./BT20-011.js";
import "./BT20-074.js";

describe("BT20-094 Emperor Dragon of Calamity", () => {
  it("reduces the optional Free Digimon trash play by 5 and then places itself", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], payCost: true, reduceCostBy: 5, optional: true },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("makes Dragon Mode from digivolution cards the Delay action", () => {
    const delay = compiled.effects.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }],
              zone: "digivolutionCards",
              hostFilter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Imperialdramon: Fighter Mode"], match: "nameExact" }],
              },
            },
          },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(1);
  });

  it("reacts only when the opponent's security stack loses a card", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    });
  });

  it("naturally plays a Free Digimon from trash with the 5-cost reduction and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT10-071", as: "purpleSource" },
          ],
          hand: [{ card: "BT20-094", as: "option" }],
          trash: [{ card: "BT20-011", as: "freeDigimon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-094"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-011", "BT20-094"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("does not arm Delay when an opponent's real attack removes your security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT10-071", as: "purpleSource" },
          ],
          hand: [{ card: "BT20-094", as: "option" }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-094"));
    const option = s.perm("option");
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === option.permanentId)).toBe(true);
    expect(observe(s.engine).hasKeyword(option, "Delay")).toBe(false);
  });

  it("arms Delay when your own attack removes the opponent's security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redSource" },
            { card: "BT10-071", as: "purpleSource" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [{ card: "BT20-094", as: "option" }],
        },
        1: { security: ["BT1-010"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-094"));
    const option = s.perm("option");
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && observe(s.engine).hasKeyword(option, "Delay"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === option.permanentId)).toBe(true);
    expect(observe(s.engine).hasKeyword(option, "Delay")).toBe(true);
  });
});
