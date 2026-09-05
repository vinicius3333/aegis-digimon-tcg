import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-049.js";

describe("EX5-049 GrapLeomon", () => {
  it("has Fortitude and returns an opposing Digimon at 4000 DP or less to deck bottom on play/digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
    });
  });
  it("inherits Piercing while it has Leomon in its name", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
          while: { kind: "selfHasNameContaining", names: ["Leomon"] },
        },
      ],
    });
  });

  it("returns one opposing Digimon at the 4000 DP boundary to the bottom of its deck on public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-049", as: "grap" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "boundary", dp: 4000 },
            { card: "BT1-019", as: "above", dp: 6000 },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grap").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-015"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-015")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-019")).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-015");
    expect(observe(s.engine).hasKeyword(s.perm("grap"), "Fortitude")).toBe(true);
  });

  it("uses the Leomon alternate evolution route for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-047", as: "base" }], hand: [{ card: "EX5-049", as: "grap" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grap").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX5-049");
    expect(s.perm("base").topCard.cardId).toBe("EX5-049");
    expect(s.state.memory).toBe(0);
  });

  it("rejects the Leomon alternate evolution route from a non-Leomon base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX5-049", as: "grap" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grap").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
  });

  it("grants inherited Piercing only when the host's current top card has Leomon in its name", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "EX5-055", as: "host", under: ["EX5-049"] }] } });
    await matching.ready();
    await advance(matching.engine).recompute();
    expect(observe(matching.engine).hasPierce(matching.perm("host"))).toBe(true);

    const nonMatching = setupEngine({ 0: { battleArea: [{ card: "EX5-050", as: "host", under: ["EX5-049"] }] } });
    await nonMatching.ready();
    await advance(nonMatching.engine).recompute();
    expect(observe(nonMatching.engine).hasPierce(nonMatching.perm("host"))).toBe(false);
  });
});
