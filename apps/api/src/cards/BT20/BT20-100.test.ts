import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-100.js";
import "./index.js";

describe("BT20-100 The Last Guardian", () => {
  it("reveals Cool Boy and a Royal Knight/X Antibody card, then places itself", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { count: 1, filter: { nameOrTrait: [{ tokens: ["Cool Boy"], match: "nameExact" }] } },
            { count: 1, filter: { nameOrTrait: [{ tokens: ["Royal Knight", "X Antibody"], match: "trait" }] } },
          ],
          rest: "deckBottom",
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Omekamon", "Cool Boy"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses Delay to prevent one Omnimon leaving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { zone: "battleArea", nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }] },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              isTriggerSource: true,
              nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }],
            },
            count: 1,
          },
          actions: [],
        },
      ],
    });
  });

  it("naturally adds Cool Boy and a Royal Knight from the revealed top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-100", as: "option" }],
          battleArea: ["BT20-092"],
          deck: ["BT20-091", "BT20-056", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-091", "BT20-056"]),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-100");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("uses Delay to prevent an own Omnimon from leaving and trashes this Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-100", as: "option" },
            { card: "BT5-086", as: "omnimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;

    await advance(s.engine).verb.deletePermanent([s.perm("omnimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT20-100"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-086")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-100")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-100")).toBe(true);
  });

  it("does not prevent a non-Omnimon departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-100", as: "option" },
            { card: "BT1-010", as: "otherDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;

    await advance(s.engine).verb.deletePermanent([s.perm("otherDigimon").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-100")).toBe(true);
  });

  it("plays from Security through a public attack and places itself afterward", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
        1: { security: [{ card: "BT20-100", as: "securityOption" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100"));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-100")).toBe(true);
  });
});
