import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-079.js";
import "../index.js";

describe("BT15-079", () => {
  it("deletes its battle opponent when deleted after losing a battle", () =>
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { filter: { sourceRef: "battleOpponent" } } }],
    }));
  it("deletes an unsuspended opposing Digimon on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { unsuspended: true } } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Delete" }] });
  });
  it("restricts this Digimon to white digivolution targets during its owner's turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "RestrictDigivolveInto",
          target: { filter: { isSelfRef: true }, isSelf: true },
          into: { colors: ["White"] },
        },
      ],
    });
  });
  it("deletes itself at opponent end to play a non-Piedmon Dark Masters and unsuspends as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
  });

  it("naturally deletes exactly one unsuspended opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-079", as: "piedmon" }] },
        1: {
          battleArea: [
            { card: "BT15-072", as: "unsuspendedLevel4" },
            { card: "BT15-076", as: "unsuspendedLevel5" },
            { card: "BT15-079", as: "unsuspendedLevel6" },
            { card: "BT15-072", as: "suspendedLevel4", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1 && s.state.players[1]!.battleArea.length === 3);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("suspendedLevel4").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => ["BT15-072", "BT15-076"].includes(cardId))).toHaveLength(1);
  });

  it("naturally deletes itself at the opponent end and plays a different Dark Master for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-079", as: "piedmon" }],
          hand: [
            { card: "BT15-052", as: "puppetmon" },
            { card: "BT15-079", as: "excludedPiedmon" },
          ],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-052"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("piedmon").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT15-052");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("excludedPiedmon").instanceId,
    );
  });

  it("naturally uses the Piedmon inherited effect from a stack after losing a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-102", as: "host", under: ["BT15-079"], dp: 5000, suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("host").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("attacker").instanceId);
  });
});
