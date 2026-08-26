import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-049.js";

describe("BT10-049 Ballistamon", () => {
  it("matches its catalog, alternate evolution, and three exact clauses", () => {
    const d = getCardDefinition("BT10-049")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 4, 4, 4000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 3, memoryCost: 2 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Champion"], ["Vaccine"], ["Machine", "Xros Heart"]]);
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, traits: ["Xros Heart"], cost: 2, isAlternate: true }],
    });
    expect(compiled.effects.map((effect) => [effect.trigger, effect.isInherited])).toEqual([
      ["OpponentsTurn", undefined],
      ["OnDeletion", undefined],
      ["YourTurn", true],
    ]);
  });

  it("digivolves for 2 by either the green catalog route or Xros Heart alternate route", async () => {
    for (const baseCard of ["BT10-046", "BT10-008"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "BT10-049", as: "evolving" }] },
      });
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT10-049");
      expect(s.state.memory).toBe(0);
    }
  });

  it("gains Blocker on the opponent's turn while another Xros Heart permanent is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-049", as: "source" }, "BT10-087"] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(false);
  });

  it("does not count itself as the other Xros Heart permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-049", as: "source" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(false);
  });

  it("grants Piercing only while its host has Shoutmon in its name", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-049"] }] } });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).hasPierce(matching.perm("host"))).toBe(true);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-049"] }] } });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).hasPierce(other.perm("host"))).toBe(false);
  });

  it("may Save itself under a Tamer when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-049", as: "source" },
            { card: "BT10-087", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const sourceId = s.perm("source").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId])).toBe(1);
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === sourceId));

    expect(s.perm("tamer").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(false);
  });
});
