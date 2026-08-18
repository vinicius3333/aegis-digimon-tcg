import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-044.js";
import "./BT9-023.js";

describe("BT9-044 Magnamon (X Antibody)", () => {
  it("may place its top card face down in security to prevent deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-044", as: "magna", under: ["BT8-038"] }] } }, { autoAcceptOptional: true });
    const permanentId = s.perm("magna").permanentId;
    const topId = s.perm("magna").topCard!.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("magna").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.permanentId).toBe(permanentId);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT8-038");
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === topId && card.faceUp !== true)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });

  it("redirects an unblockable player attack while remaining unsuspended when X Antibody is in its stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-044", as: "magna", under: ["BT9-109"] }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT9-023", as: "attacker" }] },
    }, { autoAcceptOptional: true });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("magna").isSuspended).toBe(false);
  });

  it("does not treat an X Antibody trait as the specifically named X Antibody card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-044", as: "magna", under: ["BT9-044"] }],
        security: [{ card: "BT1-001", as: "security" }],
      },
      1: { battleArea: [{ card: "BT9-023", as: "attacker" }] },
    }, { autoAcceptOptional: true });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("cannot prevent deletion without a digivolution card to place in security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-044", as: "magna" }] },
    }, { autoAcceptOptional: true });

    await advance(s.engine).verb.deletePermanent([s.perm("magna").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT9-044")).toBe(true);
  });
});
