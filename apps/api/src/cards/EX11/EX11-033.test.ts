import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-033";

describe("EX11-033 Maneuvermon", () => {
  it("preserves printed stats, text evolution, linking, and scoped subtriggers", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Maneuvermon",
      colors: ["Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Beast", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Link",
        from: ["hand", "digivolutionCards"],
        recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        payCost: false,
        optional: true,
      });
    }
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn.actions).toHaveLength(1);
    expect(yourTurn.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { isSelfRef: true },
          }),
        ],
      }),
    );
  });

  it("links Maquinamon from hand to a chosen allied Digimon without paying", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("maquinamon").instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked.map(({ cardId: id }) => id)).toEqual(["EX11-027"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("inherits a once-per-turn unsuspend only when its own host deletes in battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-034", as: "host", under: [cardId], suspended: true }] } },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").isSuspended).toBe(false);
    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.perm("host").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
