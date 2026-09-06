import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-12.js";

describe("ST23-12 Chiropmon", () => {
  it("trashes the exact bottom face-down Tamer card to return a Glowing Dawn Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] }],
          hand: [{ card: "ST23-12", as: "liollmon" }],
          trash: [{ card: "ST23-03", as: "returnTarget" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const underId = s.perm("tamer").stack[0]!.instanceId;
    const returnedId = s.inst("returnTarget").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === returnedId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === underId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === returnedId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
  });

  it("can return the Glowing Dawn Digimon that was just trashed to pay the effect cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tamer", under: [{ card: "ST23-03", as: "cost", faceUp: false }] }],
          hand: [{ card: "ST23-12", as: "chiropmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chiropmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === costId) &&
        !s.perm("tamer").stack.some((card) => card.instanceId === costId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(costId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).not.toContain(costId);
  });
  it("uses inherited Retaliation when its host loses a real battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST6-07", as: "host", under: ["ST23-12"] }] },
      1: { battleArea: [{ card: "ST6-09", as: "target", suspended: true }] },
    });
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({
      kind: "combatResolved",
      deletedPermanentIds: [hostId],
    });
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });
});
