import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-030.js";
import "./index.js";

describe("BT20-030 Liollmon", () => {
  it("reveals three and independently adds one qualifying Digimon and one ACCEL Option", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Chaosmon"], match: "name" },
                  { tokens: ["ACCEL"], match: "trait" },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Barrier", raw: "＜Barrier＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Frimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["ACCEL"], cost: 0, isAlternate: true },
    ]);
  });

  it("adds one qualifying Digimon and one ACCEL Option, then bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-030", as: "liollmon" }],
          deck: [
            { card: "BT20-031", as: "accelDigimon" },
            { card: "BT20-099", as: "accelOption" },
            { card: "BT20-010", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("accelDigimon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("accelOption").instanceId) &&
        s.state.players[0]!.deck.length === 1,
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("grants Barrier only when Liollmon is an inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-031", as: "host", under: ["BT20-030"] },
          { card: "BT20-030", as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });

  it("reaches Liollmon from a legal ACCEL Pinamon stack through public evolution", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT20-004", as: "pinamon" }, hand: [{ card: "BT20-030", as: "liollmon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pinamon").permanentId,
        instanceId: s.inst("liollmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pinamon").topCard.cardId === "BT20-030");
    expect(s.perm("pinamon").topCard.cardId).toBe("BT20-030");
    expect(s.perm("pinamon").stack.map((card) => card.cardId)).toEqual(["BT20-004"]);
  });

  it.each([
    ["BT18-006", true],
    ["BT20-001", false],
  ] as const)("checks the named Frimon alternative against %s", async (egg, legal) => {
    const s = setupEngine({
      0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "BT20-030", as: "liollmon" }], deck: ["BT1-010"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("liollmon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("egg").topCard.cardId).toBe(legal ? "BT20-030" : egg);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(legal ? [egg] : []);
    expect(s.state.memory).toBe(3);
  });

  it("leaves all three revealed cards on the bottom when neither required category matches", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT20-030", as: "liollmon" }],
        deck: [
          { card: "BT20-010", as: "first" },
          { card: "BT20-011", as: "second" },
          { card: "BT20-012", as: "third" },
        ],
      },
    });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("first").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("resolves each reveal category independently when only one category is available", async () => {
    for (const [qualifying, absent] of [
      ["digimonOnly", "optionOnly"],
      ["optionOnly", "digimonOnly"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT20-030", as: "liollmon" }],
            deck: [
              { card: qualifying === "digimonOnly" ? "BT4-091" : "BT20-099", as: qualifying },
              { card: "BT20-010", as: absent },
              { card: "BT20-011", as: "other" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 3;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.deck.length === 2);
      expect(s.state.players[0]!.hand).toContainEqual(
        expect.objectContaining({ instanceId: s.inst(qualifying).instanceId }),
      );
      expect(s.state.players[0]!.hand).not.toContainEqual(
        expect.objectContaining({ instanceId: s.inst(absent).instanceId }),
      );
      expect(s.state.players[0]!.deck).toHaveLength(2);
    }
  });

  it.each([true, false])("uses or refuses inherited Barrier during a losing battle (accept %s)", async (accept) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-031", dp: 5000, suspended: true, as: "host", under: ["BT20-030"] }],
        security: ["BT20-010"],
      },
      1: { battleArea: [{ card: "BT20-010", dp: 9000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt" && event.permanentId === hostId));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(accept);
    expect(s.state.players[0]!.security).toHaveLength(accept ? 0 : 1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-031")).toBe(!accept);
  });
});
