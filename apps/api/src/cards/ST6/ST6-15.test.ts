import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-01.js";
import "./ST6-15.js";
import "../BT2/BT2-068.js";
import "../BT2/BT2-070.js";

describe("ST6-15 Death Claw", () => {
  it("may delete your Digimon to delete an opposing level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-03", as: "cost", under: ["ST6-01"] }],
          hand: [{ card: "ST6-15", as: "option" }],
          deck: [
            { card: "ST6-03", as: "milled1" },
            { card: "ST6-04", as: "milled2" },
          ],
        },
        1: { battleArea: [{ card: "ST6-08", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetInstanceId = s.perm("target").topCard.instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
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
    const s = setupEngine(
      {
        0: { security: [{ card: "ST6-15", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "ST6-08", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("ST6-15 Death Claw — KB Q&A rulings", () => {
  function moveIndex(events: readonly { kind: string }[], instanceId: string): number {
    return events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        "instanceIds" in event &&
        Array.isArray(event.instanceIds) &&
        event.instanceIds.includes(instanceId),
    );
  }

  it("finishes deleting the opponent's Digimon before your deleted Digimon's [On Deletion] resolves (Q676)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-070", as: "tapirmon" }],
          hand: [{ card: "ST6-15", as: "option" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { battleArea: [{ card: "ST6-08", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetInstanceId = s.perm("target").topCard.instanceId;
    const drawnInstanceId = s.inst("drawn").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === drawnInstanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const targetDeletionIndex = moveIndex(s.events, targetInstanceId);
    const onDeletionDrawIndex = moveIndex(s.events, drawnInstanceId);
    expect(targetDeletionIndex).toBeGreaterThanOrEqual(0);
    expect(onDeletionDrawIndex).toBeGreaterThan(targetDeletionIndex);
  });

  it("resolves the turn player's [On Deletion] before the opponent's when both trigger together (Q677)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-070", as: "tapirmon" }],
          hand: [{ card: "ST6-15", as: "option" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: {
          battleArea: [{ card: "BT2-068", as: "impmon" }],
          deck: [
            { card: "BT1-011", as: "milled1" },
            { card: "BT1-012", as: "milled2" },
            { card: "BT1-013", as: "milled3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnInstanceId = s.inst("drawn").instanceId;
    const milledInstanceId = s.inst("milled1").instanceId;
    const impmonInstanceId = s.perm("impmon").topCard.instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === drawnInstanceId) &&
        s.state.players[1]!.deck.length === 0,
    );

    const opponentDeletionIndex = moveIndex(s.events, impmonInstanceId);
    const turnPlayerDrawIndex = moveIndex(s.events, drawnInstanceId);
    const opponentMillIndex = moveIndex(s.events, milledInstanceId);
    expect(opponentDeletionIndex).toBeGreaterThanOrEqual(0);
    expect(turnPlayerDrawIndex).toBeGreaterThan(opponentDeletionIndex);
    expect(opponentMillIndex).toBeGreaterThan(turnPlayerDrawIndex);
  });
});
