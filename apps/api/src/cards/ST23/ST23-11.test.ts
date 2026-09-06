import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-11.js";

describe("ST23-11 Wolvermon", () => {
  it("pays the bottom face-down under-Tamer card to reduce a Glowing Dawn digivolution by two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-11", as: "base" },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
          ],
          hand: [{ card: "ST23-04", as: "target" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const underId = s.perm("tamer").stack[0]!.instanceId;
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "ST23-04" &&
        s.state.players[0]!.trash.some((card) => card.instanceId === underId),
    );
    expect(s.perm("base").topCard?.cardId).toBe("ST23-04");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === underId)).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(false);
  });

  it("allows the player to decline the by-cost and pay the full digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-11", as: "base" },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
          ],
          hand: [{ card: "ST23-04", as: "target" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const underId = s.perm("tamer").stack[0]!.instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-04" && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").stack.some((card) => card.instanceId === underId)).toBe(true);
  });

  it("redirects a real player attack with inherited Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-02", as: "attacker" }] },
      1: { battleArea: [{ card: "ST15-10", as: "host", under: ["ST23-11"] }], security: ["BT1-001"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({
      deletedPermanentIds: [attackerId],
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
