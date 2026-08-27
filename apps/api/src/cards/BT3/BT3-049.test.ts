import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-079.js";
import "./BT3-049.js";

describe("BT3-049 Flymon", () => {
  it("is played without cost after losing its security battle (Q1083)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-049", as: "securityFlymon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityFlymon").instanceId;

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

  it("is played without cost after winning its security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-049", as: "securityFlymon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityFlymon").instanceId;

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
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-049",
    );
    const playIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(instanceId),
    );
    expect(playIndex).toBeGreaterThan(checkIndex);
  });

  it("becomes a normal Digimon before the next security check (Q1082/Q1084)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-049", as: "securityFlymon" }, "BT1-011"] },
      1: { battleArea: [{ card: "BT2-079", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityFlymon").instanceId;

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
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT3-049",
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
