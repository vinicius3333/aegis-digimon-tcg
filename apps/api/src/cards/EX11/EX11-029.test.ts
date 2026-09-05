import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-029";

describe("EX11-029 Turbomon", () => {
  it("preserves both evolution requirements, link sources, and linked Unchained trigger", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Turbomon",
      colors: ["Green"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      types: ["Beast", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Maquinamon"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            expect.objectContaining({
              kind: "Link",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Maquinamon"], match: "nameExact" }],
                  hostFilter: { isSelfRef: true },
                },
                count: 1,
              },
              recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            }),
          ],
        }),
      );
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked).toMatchObject({
      frequency: "OncePerTurn",
      // "When THIS Digimon gets linked" — the bus is board-wide, so the self scope is load-bearing.
      actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true } }],
    });
    expect(linked.actions[0]).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false }],
    });
  });

  it("links Maquinamon from hand for free on play and grants its linked DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "recipient", dp: 2000 },
          ],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some(({ linked }) => linked.some(({ cardId: id }) => id === "EX11-027")),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays Unchained from trash once when this Digimon gets linked with at most one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", linked: [{ card: "EX11-027" }] }],
          trash: [{ card: "EX11-070", as: "unchained" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("source").permanentId });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-070"));
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  // The `whenLinked` bus fires for every link on the board. Without `sourceFilter: {isSelfRef:true}`
  // this watcher would play [Unchained] when a DIFFERENT Digimon of the controller gets linked.
  it("does not trigger when another of your Digimon gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            // A [Maquinamon] host satisfying the link card's own "[Maquinamon] in text"
            // requirement, and with no `whenLinked` watcher of its own.
            { card: "EX11-027", as: "other", linked: [{ card: "EX11-027" }] },
          ],
          trash: [{ card: "EX11-070", as: "unchained" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual(["EX11-070"]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-070")).toBe(false);
    assertNoLoudGap(s);
  });

  it("provides inherited Piercing in a realistic stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-031", as: "host", under: [cardId] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    assertNoLoudGap(s);
  });
});
