import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-042";

describe("EX11-042 MockingBirdmon", () => {
  it("preserves printed stats, text evolution, linking deletion, and inherited redirect", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "MockingBirdmon",
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      types: ["Machine", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Link",
        from: ["hand", "digivolutionCards"],
        payCost: false,
        optional: true,
        recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        // FAILS-WHEN-REVERTED: "THIS Digimon's digivolution cards" — without hostFilter the
        // pool spans every friendly Digimon's stack.
        target: { filter: { hostFilter: { isSelfRef: true } } },
      });
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
            },
          ],
        },
      ],
    });
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack" }] }],
    });
  });

  it("free-links Maquinamon and deletes only an opposing play-cost-5 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX11-027", as: "maquinamon" }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("maquinamon").instanceId, s.perm("cost5").permanentId);
    const cost5Id = s.perm("cost5").permanentId;
    const cost6Id = s.perm("cost6").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("maquinamon").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(cost5Id);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(cost6Id);
    assertNoLoudGap(s);
  });

  it("links a Maquinamon out of its OWN digivolution cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source", under: ["EX11-027"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked.map(({ cardId: id }) => id)).toEqual(["EX11-027"]);
    expect(s.perm("source").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  /**
   * FAILS-WHEN-REVERTED: dropping `hostFilter: { isSelfRef: true }` lets the effect pull the
   * decoy's buried Maquinamon, so both assertions below flip.
   */
  it("never pulls a Maquinamon out of another Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-019", as: "decoy", under: ["EX11-027"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked).toHaveLength(0);
    expect(s.perm("decoy").stack.map(({ cardId: id }) => id)).toEqual(["EX11-027"]);
    assertNoLoudGap(s);
  });
});
