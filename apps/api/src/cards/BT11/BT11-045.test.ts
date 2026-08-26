import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-114.js";
import { compiled } from "./BT11-045.js";

describe("BT11-045 ClavisAngemon", () => {
  it("maps its yellow level-six catalog facts and both executable clauses", () => {
    expect(getCardDefinition("BT11-045")).toMatchObject({ cardId: "BT11-045", colors: ["Yellow"], level: 6, playCost: 12, dp: 12000, types: ["Virtue"] });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "SecurityManipulation", op: "addTop", condition: { kind: "zoneCount", value: 5 } }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }] });
  });

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

  it("does not recover when digivolving with 6 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-042", as: "base" }],
        hand: [{ card: "BT11-045", as: "clavis" }],
        deck: [{ card: "BT1-001", as: "top" }],
        security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
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
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === "BT11-045");

    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("Q2086: gives -4000 DP once for each security card removed by one attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-045", as: "clavis" }],
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
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
    await settle(() => attacker.currentDP === 0);

    // MetalGreymon's printed Security Attack +2 removes three cards during this attack.
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(attacker.currentDP).toBe(0);
    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "BT11-045" && req.kind === "chooseTargets"),
    ).toHaveLength(0);
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
import { getCardDefinition } from "@aegis/shared";
