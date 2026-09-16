import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function alive(p: PlayerState, permanentId: string): boolean {
  return p.battleArea.some((perm) => perm.permanentId === permanentId);
}

describe("A3 EX5-053 (Baihumon) — OnSecurityCheck mandatory Deva play, without battling", () => {
  it("plays a revealed [Deva] Digimon to the battle area without battling, skipping the normal battle resolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX5-053", dp: 12000, as: "baihumon" }],
        security: [{ card: "BT10-079", as: "revealed" }],
      },
    });
    const p1 = s.state.players[1] as PlayerState;
    const trashBefore = p1.trash.length;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((e) => e.kind === "securityChecked"));

    const revealedInstanceId = s.inst("revealed").instanceId;
    const playedPermanent = p1.battleArea.find((perm) => perm.topCard?.instanceId === revealedInstanceId);
    expect(playedPermanent, "the revealed Deva Digimon must be played to the battle area").toBeDefined();

    expect(p1.security.some((c) => c.instanceId === revealedInstanceId)).toBe(false);

    expect(p1.trash.some((c) => c.instanceId === revealedInstanceId)).toBe(false);
    expect(p1.trash.length).toBe(trashBefore);

    expect(alive(s.state.players[0] as PlayerState, attackerId)).toBe(true);

    const checkedEvent = s.events.find(
      (e) => e.kind === "securityChecked" && "revealedCardId" in e && e.revealedCardId === "BT10-079",
    );
    expect(checkedEvent, "a securityChecked event must be emitted for the revealed card").toBeDefined();
    expect(checkedEvent && "resolution" in checkedEvent ? checkedEvent.resolution : undefined).toBe("effect");
  });

  it("does NOT force-play a revealed non-Deva Digimon — normal battle/trash resolution runs (the [Deva] gate)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX5-053", dp: 12000, as: "baihumon" }],
        security: [{ card: "AD1-001", as: "revealed" }],
      },
    });
    const p1 = s.state.players[1] as PlayerState;
    const revealedInstanceId = s.inst("revealed").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((e) => e.kind === "securityChecked"));

    expect(alive(s.state.players[0] as PlayerState, attackerId)).toBe(false);

    expect(p1.battleArea.some((perm) => perm.topCard?.instanceId === revealedInstanceId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === revealedInstanceId)).toBe(true);

    const checkedEvent = s.events.find(
      (e) => e.kind === "securityChecked" && "revealedCardId" in e && e.revealedCardId === "AD1-001",
    );
    expect(checkedEvent, "a securityChecked event must be emitted for the revealed card").toBeDefined();
    expect(checkedEvent && "resolution" in checkedEvent ? checkedEvent.resolution : undefined).toBe("battle");
  });
});
