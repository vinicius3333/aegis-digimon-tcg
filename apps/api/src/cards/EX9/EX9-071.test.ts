import { describe, expect, it } from "vitest";
import "./EX9-071.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

function delayEntry(permanent: { activatableEffectsJson?: string }, instanceId: string) {
  const entries = JSON.parse(permanent.activatableEffectsJson || "[]") as Array<{
    instanceId: string;
    effectKey: string;
    description: string;
  }>;
  return entries.find((entry) => entry.instanceId === instanceId && /delay/i.test(entry.description));
}

describe("EX9-071 Protein", () => {
  it("registers the audited cost shape", () => {
    const delay = runtimeCompiledCard("EX9-071")!.effects.find((effect) =>
      effect.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay?.actions[0]?.cost?.target?.count).toBe(2);
  });
  it("Q4834: a DM Digimon in breeding waives the blue color requirement, then Main draws and places Protein", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX9-007", as: "dm" },
        hand: [{ card: "EX9-071", as: "protein" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("protein").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX9-071"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("EX9-071");
  });

  it("Q4833: Delay trashes both bottom face-down cards from one DM host and unsuspends that host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-071", as: "protein" },
            {
              card: "EX9-007",
              as: "dm",
              suspended: true,
              under: [
                { card: "BT1-001", as: "bottom", faceUp: false },
                { card: "BT1-009", as: "second", faceUp: false },
                { card: "BT1-010", as: "third" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const protein = s.perm("protein");
    protein.placedByEffect = true;
    protein.enterFieldTurnCount = s.state.turnCount - 1;
    (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
    const entry = delayEntry(protein, protein.topCard.instanceId);
    expect(entry).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: protein.topCard.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX9-071"));
    await settle();

    expect(s.perm("dm").isSuspended).toBe(false);
    expect(s.perm("dm").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("third").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("second").instanceId]),
    );
  });

  it("Q4833: cannot combine one eligible card from each of two DM hosts", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-071", as: "protein" },
          { card: "EX9-007", as: "firstDm", suspended: true, under: [{ card: "BT1-001", faceUp: false }] },
          { card: "EX9-008", as: "secondDm", suspended: true, under: [{ card: "BT1-009", faceUp: false }] },
        ],
      },
    });
    const protein = s.perm("protein");
    protein.placedByEffect = true;
    protein.enterFieldTurnCount = s.state.turnCount - 1;
    (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();

    expect(delayEntry(protein, protein.topCard.instanceId)).toBeUndefined();
  });
});
