import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-006.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-006", () => {
  it("inherits a once-per-turn Ver.5 digivolution from trash by trashing its bottom face-down digivolution card", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true, cost: { kind: "trash", target: { count: 1 } } }] }));

  it("trashes the bottom face-down source and digivolves into a Ver.5 from trash on attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-006", as: "source", under: [{ card: "BT1-009", faceUp: false }] }], trash: ["EX9-010"] },
      1: {},
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("source").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-010")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("does not pay the effect with a face-up bottom source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-006", as: "source", under: [{ card: "BT1-009", faceUp: true }] }], trash: ["EX9-010"] },
      1: {},
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("source").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX9-010"));

    expect(s.perm("source").topCard?.cardId).toBe("EX9-006");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(false);
  });
});
