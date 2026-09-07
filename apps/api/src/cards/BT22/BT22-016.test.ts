import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-016.js";

describe("BT22-016 Mcmon", () => {
  it("reveals Appmon and Entertainment/Awakening cards and has its link effect", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          expect.objectContaining({
            kind: "RevealAdd",
            revealCount: 3,
            add: expect.arrayContaining([
              expect.objectContaining({
                filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
                count: 1,
              }),
              expect.objectContaining({
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Entertainment", "Awakening"], match: "trait" }],
                },
                count: 1,
              }),
            ]),
          }),
        ],
      }),
    );
    const linking = compiled.effects.find((entry) => entry.trigger === "WhenLinking");
    expect(linking).toMatchObject({ isLinked: true });
    expect(linking?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
    });
  });

  it("reveals three, adds one Appmon and one Entertainment card, and bottoms the rest", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-016", as: "mcmon" }],
          deck: [
            { card: "BT22-009", as: "entertainment" },
            { card: "BT22-016", as: "appmon" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("appmon").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mcmon").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 1 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("appmon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("entertainment").instanceId),
    );

    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("entertainment").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("selects an Appmon and an Awakening App Name card as independent additions", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-016", as: "mcmon" }],
          deck: [
            { card: "BT22-016", as: "appmon" },
            { card: "BT22-039", as: "awakening" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mcmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("awakening").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("accepts an Awakening App Name card independently of Entertainment", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-016", as: "mcmon" }],
          deck: [
            { card: "BT22-016", as: "appmon" },
            { card: "BT22-039", as: "awakening" },
            { card: "BT1-009", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mcmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT22-016", "BT22-039"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("trashes one chosen digivolution card when linked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-009", as: "host", linked: [{ card: "BT22-016", as: "mcmon" }] }] },
        1: { battleArea: [{ card: "BT22-010", under: ["BT22-003", "BT22-008"], as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnLinking, s.inst("mcmon"), {
      subjectPermanentId: s.perm("host").permanentId,
      linkedInstanceIds: [s.inst("mcmon").instanceId],
    });

    expect(s.perm("opponent").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("links from hand for the printed cost 1 and resolves the linked trash effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-009", as: "host" }], hand: [{ card: "BT22-016", as: "mcmon" }] },
      1: { battleArea: [{ card: "BT22-010", under: ["BT22-003", "BT22-008"], as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mcmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("mcmon").instanceId));
    expect(s.state.memory).toBe(4);
    expect(s.perm("opponent").stack).toHaveLength(1);
  });
});
