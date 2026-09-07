import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-097.js";
import "./index.js";

describe("BT20-097 The Apostle of Doom Descends!", () => {
  it("uses the reduced-cost trash digivolution and then places itself", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.keywords)).toMatchObject({
      actions: [
        { kind: "Digivolve", from: ["trash"], payCost: true, reduceCost: 4, optional: true },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("makes the DeathXmon play a Delay action paid by a stacked Dorumon", () => {
    const delay = compiled.effects.find(
      (entry) => entry.trigger === "AllTurns" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigimonWouldLeave",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
            nameOrTrait: [{ tokens: ["DexDorugoramon"], match: "nameExact" }],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { nameOrTrait: [{ tokens: ["DeathXmon"], match: "nameExact" }] },
              },
              from: ["trash"],
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "return",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    zone: "digivolutionCards",
                    hostFilter: { isTriggerSource: true },
                    nameOrTrait: [{ tokens: ["Dorumon"], match: "nameExact" }],
                  },
                },
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dorumon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("naturally digivolves a battle-area Digimon into a qualifying trash card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-097", as: "option" },
            { card: "BT1-010", as: "discard" },
          ],
          battleArea: [{ card: "BT20-047", as: "host" }, "BT20-062"],
          trash: [{ card: "BT17-065", as: "dexDorugamon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT17-065");

    expect(s.perm("host").topCard.cardId).toBe("BT17-065");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-097");
  });

  it("activates Delay when a stacked DexDorugoramon would leave the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-097", as: "option" },
            { card: "BT17-073", as: "dexDorugoramon", under: ["BT20-048"] },
          ],
          trash: [{ card: "BT20-082", as: "deathXmon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;

    await advance(s.engine).verb.deletePermanent([s.perm("dexDorugoramon").permanentId], "byEffect");
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-082"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-082")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT20-048")).toBe(true);
  });

  it("does not arm Delay when DexDorugoramon leaves the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-097", as: "option" }],
          breeding: { card: "BT17-073", as: "breedingDex", under: ["BT20-048"] },
          trash: [{ card: "BT20-082", as: "deathXmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    s.state.turnCount += 1;

    await advance(s.engine).verb.deletePermanent([s.perm("breedingDex").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.breeding === undefined);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-097")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-082")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-082")).toBe(true);
  });

  it("public Security check plays Dorumon and returns this Option to hand, with refusal preserving Dorumon", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
          1: { hand: [{ card: "BT20-048", as: "dorumon" }], security: [{ card: "BT20-097", faceUp: true }] },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT20-097"));
      expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT20-097");
      expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-048")).toBe(accept);
      expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT20-048")).toBe(!accept);
    }
  });

  it("Delay refusal preserves the stacked Dorumon and DeathXmon in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-097", as: "option" },
            { card: "BT17-073", as: "dex", under: ["BT20-048"] },
          ],
          trash: [{ card: "BT20-082", as: "deathX" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("dex").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.every((p) => p.topCard.cardId !== "BT20-082"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-082", "BT20-048"]),
    );
  });
});
