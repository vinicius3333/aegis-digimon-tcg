import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";
import { compiled } from "./BT15-033.js";

describe("BT15-033", () => {
  it("registers only compiled inherited battle-deletion replacement IR", () => {
    expect(registeredCompiledCards.get("BT15-033")).toBeDefined();
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          mode: "prevent",
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
  });

  it("trashes the top security card to prevent its inherited host's battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-034", as: "host", suspended: true, under: ["BT15-033"] }],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
        },
        1: { battleArea: [{ card: "BT15-029", as: "attacker" }] },
      },
      { autoAcceptOptional: true },
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
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("topSecurity").instanceId));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottomSecurity").instanceId,
    ]);
  });

  it("allows battle deletion when the security payment is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-034", as: "host", suspended: true, under: ["BT15-033"] }],
          security: [{ card: "BT1-001", as: "security" }],
        },
        1: { battleArea: [{ card: "BT15-029", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId));

    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("cannot prevent battle deletion with an empty security stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-034", as: "host", suspended: true, under: ["BT15-033"] }] },
        1: { battleArea: [{ card: "BT15-029", as: "attacker" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
  });

  it("does not spend security or prevent deletion by an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-034", as: "host", under: ["BT15-033"] }],
        security: [{ card: "BT1-001", as: "security" }],
      },
    }, { autoAcceptOptional: true });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(1);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("security").instanceId]);
  });
});
