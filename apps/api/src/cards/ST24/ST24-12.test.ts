import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-12 Falcomon", () => {
  it("trashes the bottom face-down Tamer card to return a DATA SQUAD Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "under", faceUp: false }] }],
          hand: [{ card: "ST24-12", as: "falcomon" }],
          trash: [{ card: "ST24-08", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("falcomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("under").instanceId)).toBe(true);
  });

  it("inherits once-per-turn deletion of an opposing level 3 Digimon on attack", () => {
    const compiled = registeredCompiledCards.get("ST24-12") ?? getCompiledCard("ST24-12")!;
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 } },
      ],
    });
  });

  it("deletes a level 3 target on a real attack while retaining a level 4 target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST24-03", as: "host", under: [{ card: "ST24-12" }] }] },
        1: {
          battleArea: [
            { card: "ST24-04", as: "level3", suspended: true },
            { card: "ST24-05", as: "level4", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const level3Id = s.perm("level3").permanentId;
    const level4Id = s.perm("level4").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("level4").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level3Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id)).toBe(true);
  });
});
