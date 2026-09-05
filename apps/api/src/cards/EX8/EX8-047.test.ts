import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-047.js";

describe("EX8-047", () => {
  it("inherits deletion from a Mineral/Rock host when this card is trashed", () =>
    expect(compiled.effects?.filter((entry) => entry.isInherited)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [expect.objectContaining({ kind: "SubTrigger", event: "onDigivolutionCardsDiscardedBatch" })],
        }),
      ]),
    ));
  it("reveals 3 for Mineral/Rock and LIBERATOR cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("gains Mineral as a rule trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Mineral"],
    });
  });
  it.each(["EX8-048", "EX8-050"])("reveals %s and LIBERATOR matches and bottoms the rest", async (match) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-047", as: "source" }],
          deck: [
            { card: match, as: "mineral" },
            { card: "EX8-065", as: "liberator" },
            { card: "AD1-001", as: "rest" },
            { card: "BT1-001", as: "anchor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === s.inst("mineral").instanceId) &&
        player.hand.some((card) => card.instanceId === s.inst("liberator").instanceId),
    );
    expect(player.hand.some((card) => card.instanceId === s.inst("mineral").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("liberator").instanceId)).toBe(true);
    expect(player.deck.map((card) => card.instanceId)).toEqual([
      s.inst("anchor").instanceId,
      s.inst("rest").instanceId,
    ]);
  });

  it.each([
    ["EX8-048", true, false],
    ["BT4-070", true, true],
    ["BT2-057", false, false],
  ] as const)(
    "checks the %s host trait after an opposing On Play trashes this source",
    async (host, deletes, levelFive) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT2-057", as: "costFour" }],
            hand: [{ card: "EX8-022", as: "frigimon" }],
          },
          1: {
            battleArea: [
              {
                card: host,
                as: "host",
                under: [{ card: "EX8-047", as: "discarded" }, ...(levelFive ? [{ card: "BT2-057" }] : [])],
              },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 10;
      const discardedId = s.inst("discarded").instanceId;
      const targetId = s.inst("costFour").instanceId;
      const frigimonId = s.inst("frigimon").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: frigimonId })).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === discardedId));
      await settle(() =>
        deletes ? s.state.players[0]!.trash.some((card) => card.instanceId === targetId) : s.state.memory === 6,
      );
      expect(s.perm("host").stack).toHaveLength(0);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(discardedId);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === targetId)).toBe(deletes);
      expect(s.state.players[0]!.battleArea).toHaveLength(deletes ? 1 : 2);
      // The cost-5 source of the discard is outside the inherited cost-4 ceiling.
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === frigimonId)).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("exposes Mineral as a live rule trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-047", as: "sunarizamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("sunarizamon"), "Mineral")).toBe(true);
  });
});
