import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-026.js";

describe("EX8-026", () => {
  it("has Blast Digivolve, de-digivolves and bottom-decks an opposing Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "DeDigivolve", amount: 1 },
      { kind: "Return", to: "deckBottom", target: { filter: { playCostLte: 7 } } },
    ]);
  });
  it("prevents opposing Digimon from suspending while you have at least 1 memory and grants Aquatic", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      while: { kind: "memoryAtLeast", value: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Aquatic"],
    });
  });
  it("applies and removes the live opposing suspend restriction at the memory threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);

    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);
  });

  it("de-digivolves first, then bottom-decks the newly exposed play-cost-3 Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: [{ card: "BT1-024", as: "base" }] }] },
      },
      { autoSelectCards: true },
    );
    const baseId = s.inst("base").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("metal"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(baseId);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-004")).toBe(true);
  });

  it("blocks an opposing attack at +1 memory, including the Blitz legality path (Q3892–Q3893)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
        1: { battleArea: [{ card: "BT5-017", as: "blitz" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    // Memory is signed from the turn player's perspective; -1 means the
    // non-turn owner (the MetalSeadramon controller) has 1 memory.
    s.state.memory = -1;
    await s.ready();
    // Crossed memory opens the engine's normal Blitz confirmation window;
    // accept that window so the following intent reaches attack legality,
    // where EX8-026's suspend prohibition is asserted.
    (s.engine as unknown as { checkTurnEndAfterVerb: () => void }).checkTurnEndAfterVerb();
    await settle(() => s.engine.hasAcceptedBlitzAttack(s.perm("blitz").permanentId));
    expect(s.state.phase).toBe("Main");
    expect(s.engine.hasAcceptedBlitzAttack(s.perm("blitz").permanentId)).toBe(true);

    expect(observe(s.engine).isRestricted(s.perm("blitz"), "suspend")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("blitz").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("uses the source owner's side of the memory gauge off-turn (Q3892)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-026", as: "metal" }] },
      1: { battleArea: [{ card: "BT5-009", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("uses the level-5 DS route for 3 and resolves the same removal sequence", async () => {
    expect(digivolutionRequirementsFor("EX8-026")).toContainEqual({
      level: 5,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-024", as: "megaSeadramon" }], hand: [{ card: "EX8-026", as: "metal" }] },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-024"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megaSeadramon").permanentId,
        instanceId: s.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("megaSeadramon"), "Aquatic")).toBe(true);
  });
});
