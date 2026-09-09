import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-042.js";
import "./index.js";

const handIds = (s: ReturnType<typeof setupEngine>) => s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
const deckIds = (s: ReturnType<typeof setupEngine>) => s.state.players[0]!.deck.map(({ instanceId }) => instanceId);

describe("BT17-042 Argomon", () => {
  it("matches the catalog identity, printed text and evolution route", () => {
    const definition = getCardDefinition("BT17-042");
    expect(definition).toMatchObject({
      cardId: "BT17-042",
      nameEn: "Argomon",
      colors: ["Green", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      inheritedEffectText: "[On Deletion] Gain 1 memory.",
    });
    expect(definition!.effectText).toContain("[Digivolve]Lv.2 [Argomon]: Cost 0");
    expect(definition!.effectText).toContain(
      "[On Play] Reveal the top 3 cards of your deck. Add 1 [Argomon] and 1 [Rhythm] among them to the hand. Return the rest to the bottom of the deck.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Argomon"], level: 2, cost: 0, isAlternate: true },
    ]);
  });

  it("compiles the printed [Argomon]/[Rhythm] brackets as exact names, not substrings", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Argomon"], match: "nameExact" }] },
          count: 1,
          to: "hand",
        },
        {
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "nameExact" }] },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("gains one memory on deletion as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("adds the revealed Argomon and Rhythm and bottoms the remainder (Q2796)", async () => {
    // No autoAcceptOptional: the add is mandatory, so both cards must move with no prompt.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-042", as: "argomon" }, "BT1-009"],
          deck: [
            { card: "BT17-045", as: "revealedArgomon" },
            { card: "BT17-089", as: "revealedRhythm" },
            { card: "BT1-009", as: "bottomCard" },
            { card: "BT1-010", as: "deckTail" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    const revealedArgomonId = s.inst("revealedArgomon").instanceId;
    const revealedRhythmId = s.inst("revealedRhythm").instanceId;
    const bottomCardId = s.inst("bottomCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("argomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => handIds(s).includes(revealedRhythmId));

    expect(handIds(s)).toEqual(expect.arrayContaining([revealedArgomonId, revealedRhythmId]));
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(deckIds(s).at(-1)).toBe(bottomCardId);
    expect(deckIds(s)).not.toContain(revealedArgomonId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-042")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds the only applicable card when just one bracket is revealed (Q2795)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-042", as: "argomon" }, "BT1-009"],
          deck: [
            { card: "BT17-048", as: "revealedArgomon" },
            { card: "BT1-010", as: "filler1" },
            { card: "BT1-011", as: "filler2" },
            { card: "BT1-012", as: "deckTail" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    const revealedArgomonId = s.inst("revealedArgomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("argomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => handIds(s).includes(revealedArgomonId));

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(deckIds(s)).toEqual([
      s.inst("deckTail").instanceId,
      s.inst("filler1").instanceId,
      s.inst("filler2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("bottoms all three when neither bracket is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-042", as: "argomon" }, "BT1-009"],
          deck: [
            { card: "BT1-010", as: "filler1" },
            { card: "BT1-011", as: "filler2" },
            { card: "BT1-012", as: "filler3" },
            { card: "BT1-013", as: "deckTail" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("argomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-042"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(deckIds(s)).toEqual([
      s.inst("deckTail").instanceId,
      s.inst("filler1").instanceId,
      s.inst("filler2").instanceId,
      s.inst("filler3").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds only one of two revealed [Argomon] cards, alongside the [Rhythm]", async () => {
    // Comparative peer case: two same-name candidates for a count:1 slot.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-042", as: "argomon" }, "BT1-009"],
          deck: [
            { card: "BT17-045", as: "firstArgomon" },
            { card: "BT17-051", as: "secondArgomon" },
            { card: "BT17-089", as: "revealedRhythm" },
            { card: "BT1-010", as: "deckTail" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    const argomonIds = [s.inst("firstArgomon").instanceId, s.inst("secondArgomon").instanceId];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("argomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => handIds(s).includes(s.inst("revealedRhythm").instanceId));

    expect(handIds(s).filter((id) => argomonIds.includes(id))).toHaveLength(1);
    expect(deckIds(s).filter((id) => argomonIds.includes(id))).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly digivolves from a Lv2 [Argomon] Digi-Egg through the printed route for 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT17-004", as: "egg" },
        hand: [{ card: "BT17-042", as: "argomon" }, "BT1-009"],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const eggId = s.inst("egg").instanceId;
    const argomonId = s.inst("argomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: argomonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === argomonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(handIds(s)).not.toContain(argomonId);
  });

  it("publicly digivolves from a green Lv2 Digi-Egg through the normal route for 1", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "tanemon" },
        hand: [{ card: "BT17-042", as: "argomon" }, "BT1-009"],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const tanemonId = s.inst("tanemon").instanceId;
    const argomonId = s.inst("argomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tanemon").permanentId,
        instanceId: argomonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === argomonId);

    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([tanemonId]);
  });

  it("refuses the cost-0 route from a Lv2 Digi-Egg that is not named Argomon", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "tanemon" },
        hand: [{ card: "BT17-042", as: "argomon" }, "BT1-009"],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    // The alternate route falls back to the catalog route, so the memory delta is the proof.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tanemon").permanentId,
        instanceId: s.inst("argomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-042");

    expect(s.state.memory).toBe(-1);
  });

  it("gives its controller 1 memory when the Digimon above it is deleted in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-045", as: "attacker", under: ["BT17-042"] }],
        hand: ["BT1-009"],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "wall", dp: 20000, suspended: true }],
        hand: ["BT1-009"],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-042", "BT17-045"]),
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not give memory when the Argomon under a survivor is untouched", async () => {
    // Comparative negative for the inherited clause: no deletion, no memory.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-045", as: "attacker", under: ["BT17-042"], dp: 20000 }],
        hand: ["BT1-009"],
        deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "wall", suspended: true }],
        hand: ["BT1-009"],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(s.perm("attacker").isSuspended).toBe(false);
  });
});
