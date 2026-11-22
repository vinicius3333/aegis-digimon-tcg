import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { seatClients } from "#api/engine/testkit/seatClients";
import "#api/cards/index";

describe("Falcomon face-down placement and inherited draw", () => {
  it.each([EffectTiming.OnPlay, EffectTiming.WhenMoving])(
    "places a hand card under Keenan before drawing and discarding at %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT27-074", as: "falcomon" },
              { card: "BT26-094", as: "keenan" },
              { card: "BT1-085", as: "otherTamer" },
            ],
            hand: [{ card: "BT1-009", as: "payment" }],
            deck: [{ card: "BT1-011", as: "drawn" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fire(timing, s.perm("falcomon"));
      expect(s.perm("keenan").stack.map((c) => c.instanceId)).toEqual([s.inst("payment").instanceId]);
      expect(s.perm("keenan").stack[0]!.faceUp).toBe(false);
      expect(s.perm("otherTamer").stack).toHaveLength(0);
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([s.inst("drawn").instanceId]);
    },
  );

  it.each(["missing Keenan", "empty hand", "declined"])("does not draw when the cost is %s", async (reason) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-074", as: "falcomon" },
            { card: reason === "missing Keenan" ? "BT1-085" : "BT26-094", as: "tamer" },
          ],
          hand: reason === "empty hand" ? [] : ["BT1-009"],
          deck: ["BT1-011"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: reason === "declined", autoAcceptOptional: reason !== "declined" },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("draws then discards through an evolved stack only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-078", as: "attacker", under: ["BT27-074"] }],
          hand: ["BT1-009"],
          deck: ["BT1-011", "BT1-011"],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    for (let i = 0; i < 2; i++) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2 - i && !s.state.pendingDecision);
      await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    }
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});

describe("official rulings", () => {
  function keenanBoard(under: string[] = []) {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-074", as: "falcomon" },
            {
              card: "BT26-094",
              as: "keenan",
              under: under.map((card, index) => ({ card, as: `existing${index}`, faceUp: false })),
            },
          ],
          hand: [{ card: "BT1-009", as: "payment" }],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
  }

  it("places the card at the bottom of a Tamer that already has cards under it", async () => {
    const s = keenanBoard(["BT1-012"]);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    expect(s.perm("keenan").stack.map((c) => c.instanceId)).toEqual([
      s.inst("payment").instanceId,
      s.inst("existing0").instanceId,
    ]);
    expect(s.perm("keenan").stack.every((c) => !c.faceUp)).toBe(true);
  });

  it("keeps the existing face-down order under a Tamer without offering a reorder", async () => {
    const s = keenanBoard(["BT1-012", "BT1-013"]);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    const existing = s.perm("keenan").stack.filter((c) => c.instanceId !== s.inst("payment").instanceId);
    expect(existing.map((c) => c.instanceId)).toEqual([s.inst("existing0").instanceId, s.inst("existing1").instanceId]);
    expect(s.perm("keenan").stack).toHaveLength(3);
    expect(s.decisions.some((d) => d.req.kind === "orderCards")).toBe(false);
  });

  it("shows face-down cards under a Tamer only to their owner", async () => {
    const s = keenanBoard();
    const clients = seatClients(s.engine, s.state);
    await s.ready();
    clients.patch();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    await settle();
    clients.patch();
    const seenStack = (seat: 0 | 1) =>
      clients
        .stateFor(seat)
        .players[0]!.battleArea.find(({ permanentId }) => permanentId === s.perm("keenan").permanentId)!
        .stack.map(({ cardId }) => cardId);
    expect(seenStack(0)).toEqual(["BT1-009"]);
    expect(seenStack(1)).toEqual([undefined]);
    expect(clients.decoderErrors).toEqual([]);
    clients.restore();
  });

  it("puts a trashed face-down Tamer card face up in the trash", async () => {
    const s = keenanBoard();
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("falcomon"));
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("keenan").permanentId, [s.inst("payment").instanceId], 0);
    const trashed = s.state.players[0]!.trash.find((c) => c.instanceId === s.inst("payment").instanceId);
    expect(trashed?.faceUp).toBe(true);
    expect(s.perm("keenan").stack).toHaveLength(0);
  });
});
