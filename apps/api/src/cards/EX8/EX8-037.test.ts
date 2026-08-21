import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-037.js";

describe("EX8-037", () => {
  it("plays a Uka no Mitama token when Sakuyamon or X Antibody is in its digivolution cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayToken", tokens: ["Uka no Mitama"], count: 1, payCost: false, condition: { kind: "anyOf" } }));
  it("once per turn may use an Option when one of your Digimon attacks, then unsuspends a Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking", actions: [{ kind: "UseOptionWithoutCost", from: ["hand"], optional: true }, { kind: "Unsuspend", condition: { kind: "ifThisEffectUsed" } }] }));
  it("uses a qualifying Option after attacking and unsuspends the attacker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-037", as: "sakuyamon" }], hand: [{ card: "LM-029", as: "option" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("sakuyamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("sakuyamon").isSuspended === false && !player.hand.some((card) => card.cardId === "LM-029"));
    expect(s.perm("sakuyamon").isSuspended).toBe(false);
    expect(player.hand.some((card) => card.cardId === "LM-029")).toBe(false);
  });
});
