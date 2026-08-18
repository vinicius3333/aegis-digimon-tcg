import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-114.js";
import "./BT11-045.js";

describe("BT11-045 ClavisAngemon", () => {
  it("recovers from the deck when digivolving with 5 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-042", as: "base" }],
        hand: [{ card: "BT11-045", as: "clavis" }],
        deck: [
          { card: "BT1-001", as: "digivolveDraw" },
          { card: "BT1-001", as: "recovery" },
        ],
        security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("clavis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 6);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovery").instanceId);
  });

  it("Q2086: gives -4000 DP once for each security card removed by one attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-045", as: "clavis" }],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-114", as: "attacker" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const attacker = s.perm("attacker");

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => attacker.currentDP === 1000);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(attacker.currentDP).toBe(1000);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "BT11-045" && req.kind === "chooseTargets"),
    ).toHaveLength(2);
  });

  it("reacts independently to consecutive own-security removal events", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-045", as: "clavis" }] },
        1: { battleArea: [{ card: "BT1-114", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });

    expect(s.perm("target").currentDP).toBe(1000);
  });
});
