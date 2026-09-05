import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-040";

describe("EX11-040 Mulemon", () => {
  it("preserves printed stats, Maquinamon evolution, real-link trigger, and inherited Reboot", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Mulemon",
      colors: ["Black"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      types: ["Machine", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Maquinamon"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            expect.objectContaining({
              kind: "Link",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              target: expect.objectContaining({
                filter: expect.objectContaining({ hostFilter: { isSelfRef: true } }),
              }),
            }),
          ],
        }),
      );
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked.actions).toHaveLength(1);
    expect(linked.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
    });
    expect(irNode(linked.actions[0]!).actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      condition: { kind: "permanentCount", op: "lte", value: 1 },
    });
    expect(compiled.effects.find(({ isInherited }) => isInherited)?.keywords).toContainEqual(
      expect.objectContaining({ keyword: "Reboot" }),
    );
  });

  it("free-links Maquinamon and then plays Unchained from hand at 1 or fewer Tamers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX11-027", as: "maquinamon" },
            { card: "EX11-070", as: "unchained" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("maquinamon").instanceId, s.inst("unchained").instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("maquinamon").instanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-070")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("cannot link a Maquinamon under another of the controller's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-080", as: "other", under: [{ card: "EX11-027", as: "maquinamon" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("other").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("maquinamon").instanceId]);
    expect(s.perm("source").linked).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("still links but keeps Unchained in hand while the controller has 2 Tamers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-086", as: "secondTamer" },
          ],
          hand: [
            { card: "EX11-027", as: "maquinamon" },
            { card: "EX11-070", as: "unchained" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("maquinamon").instanceId, s.inst("unchained").instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("maquinamon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("unchained").instanceId]);
    assertNoLoudGap(s);
  });
});
