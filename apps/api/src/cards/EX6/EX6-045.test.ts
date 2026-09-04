import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-045.js";

describe("EX6-045 Tsukaimon", () => {
  it("deletes an opposing level 3 Digimon on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { levels: [3] } },
    }));
  it("inherits a once-per-turn attack-ending cost by deleting another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack" }],
          cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true } } },
        },
      ],
    }));

  it("publicly deletes an opposing level 3 Digimon when Tsukaimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-045", as: "tsukai", under: ["BT1-009"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("tsukai").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("publicly ends an opponent attack by deleting another own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001"],
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX6-045"] },
            { card: "BT1-010", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("cost").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
