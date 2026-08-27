import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-079.js";
import "./BT3-024.js";

describe("BT3-024 Airdramon", () => {
  it("is played without cost after winning its security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-024", as: "airdramon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("airdramon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    const checkIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-024",
    );
    const playIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    expect(playIndex).toBeGreaterThan(checkIndex);
  });

  it("is played even when it loses the security battle against a stronger attacker (Q1062)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-024", as: "airdramon" }] },
      1: { battleArea: [{ card: "BT1-081", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("airdramon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("plays before the next security check when the attacker has Security Attack +1 (Q1063)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-024", as: "airdramon" }, "BT1-011"] },
      1: { battleArea: [{ card: "BT2-079", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("airdramon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId)).toBe(true);

    const firstCheckIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-024",
    );
    const playIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    const secondCheckIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT1-011",
    );
    expect(playIndex).toBeGreaterThan(firstCheckIndex);
    expect(secondCheckIndex).toBeGreaterThan(playIndex);
  });
});
