import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-063.js";

describe("BT8-063 Ginryumon", () => {
  it("grants Blocker to an X-Antibody host on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-066", as: "host", under: ["BT8-063"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("uses the inherited Blocker to redirect an opponent's player attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-066", as: "host", under: ["BT8-063"] }],
          security: ["BT8-034"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not grant Blocker during its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-066", as: "host", under: ["BT8-063"] }] } });
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
