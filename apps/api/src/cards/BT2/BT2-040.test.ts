import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-040.js";

describe("BT2-040 Ophanimon", () => {
  it("places itself face down in security on deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-040", as: "ophanimon" }], security: ["BT1-010"] } });
    const id = s.perm("ophanimon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId]);

    const recovered = s.state.players[0]!.security.find((card) => card.instanceId === id);
    expect(recovered).toBeDefined();
    expect(recovered!.faceUp).toBe(false);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(id);
  });

  it("returns only Ophanimon while its Maycrackmon source stays in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-040", as: "ophanimon", under: [{ card: "BT4-045", as: "maycrackmon" }] }] },
    });
    const ophanimonId = s.perm("ophanimon").topCard.instanceId;
    const maycrackmonId = s.inst("maycrackmon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId]);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([ophanimonId]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === maycrackmonId)).toBe(true);
  });

  it("Q1013 becomes an 11000 DP Security Digimon during a later check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-040", as: "ophanimon" }] },
      1: { battleArea: [{ card: "BT2-039", as: "attacker", dp: 10000 }] },
    });
    const ophanimonId = s.perm("ophanimon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("ophanimon").permanentId]);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === ophanimonId),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === ophanimonId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT2-039")).toBe(true);
  });
});
