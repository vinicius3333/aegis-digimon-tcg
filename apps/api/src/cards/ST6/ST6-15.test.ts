import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-01.js";
import "./ST6-15.js";

describe("ST6-15 Death Claw", () => {
  it("may delete your Digimon to delete an opposing level 4 or lower Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST6-03", as: "cost", under: ["ST6-01"] }],
        hand: [{ card: "ST6-15", as: "option" }],
        deck: [{ card: "ST6-03", as: "milled1" }, { card: "ST6-04", as: "milled2" }],
      },
      1: { battleArea: [{ card: "ST6-08", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const targetInstanceId = s.perm("target").topCard.instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    const targetDeletionIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(targetInstanceId),
    );
    const millIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.inst("milled1").instanceId),
    );
    expect(targetDeletionIndex).toBeGreaterThanOrEqual(0);
    expect(millIndex).toBeGreaterThan(targetDeletionIndex);
  });

  it("deletes an opposing level 4 or lower Digimon from security without a cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST6-15", as: "option", faceUp: true }] }, 1: { battleArea: [{ card: "ST6-08", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
