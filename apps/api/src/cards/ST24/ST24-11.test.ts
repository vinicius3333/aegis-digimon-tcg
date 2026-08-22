import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("ST24-11 Lilamon", () => {
  it("watches opponent suspension and Tamer-stack trash with one shared security-trash budget", () => {
    const compiled = registeredCompiledCards.get("ST24-11") ?? getCompiledCard("ST24-11")!;
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn", actions: [
      { kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      { kind: "SubTrigger", event: "whenDigivolutionTrashed", sourceFilter: { controller: "mine", kind: ["Tamer"] } },
    ] });
  });

  it("triggers both printed When Digivolving clauses through the live engine and shares one security-trash budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-10", as: "base" },
            { card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "under", faceUp: false }] },
          ],
          hand: [{ card: "ST24-11", as: "rosemon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("rosemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended && s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("under").instanceId));
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("under").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("base").permanentId, target: { kind: "permanent", permanentId: s.perm("opponent").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

});
