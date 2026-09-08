import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_058 } from "./BT24-058.js";
import "../index.js";

describe("BT24-058 Blimpmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-058")).toMatchObject({
      cardId: "BT24-058",
      nameEn: "Blimpmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Machine", "Iliad", "TS"],
    });
  });

  it("searches the two printed destination branches on play and digivolving", () => {
    const effects = BT24_058.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      const reveal = effect.actions?.[0] as any;
      expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      // One add entry offers both printed destinations: `to` is the default and `orDispositions`
      // carries the alternative, which is the pair runRevealAdd presents as one choice.
      expect(reveal.add).toHaveLength(1);
      expect(reveal.add[0]).toMatchObject({
        to: "hand",
        orDispositions: [expect.objectContaining({ to: "placeUnder" })],
      });
    }
    expect(BT24_058.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Reboot");
  });

  it("public play pays 5, adds an eligible Tamer, and returns the other cards to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-058", as: "blimpmon" }],
          deck: [
            { card: "P-133", as: "tamer" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
            { card: "BT1-009", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blimpmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-058"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("miss1").instanceId,
      s.inst("miss2").instanceId,
      s.inst("untouched").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
  });

  it("publicly places the selected eligible card under a Machine Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-058", as: "host", under: ["BT11-036"] }],
          hand: [{ card: "BT24-058", as: "blimpmon" }],
          deck: [
            { card: "P-133", as: "tamer" },
            { card: "BT1-009", as: "miss1" },
            { card: "BT1-010", as: "miss2" },
            { card: "BT1-009", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferOptionIndex: 1 },
    );

    s.state.memory = 5;
    const oldSourceId = s.perm("host").stack[0]!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blimpmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").stack.some((card) => card.instanceId === s.inst("tamer").instanceId) &&
        s.state.players[0]!.deck.length === 3,
    );
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-058"));

    expect(s.perm("blimpmon").topCard.instanceId).toBe(s.inst("blimpmon").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("tamer").instanceId, oldSourceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("untouched").instanceId,
      s.inst("miss1").instanceId,
      s.inst("miss2").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["normal black level-3 requirement", "BT11-036", false],
    ["alternate TS requirement", "BT24-043", true],
  ])("uses the %s for cost 2", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-058", as: "blimpmon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.inst("base").instanceId;
    const drawId = s.inst("evolutionDraw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blimpmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("blimpmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("blimpmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
  });

  it("grants inherited Reboot to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-059", as: "host", under: ["BT24-058"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("uses inherited Reboot during the opponent's public turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-059", as: "host", under: ["BT24-058"], suspended: true }] },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").isSuspended).toBe(true);
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
