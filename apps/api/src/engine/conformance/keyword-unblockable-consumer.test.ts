import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";
import { cite } from "./_kb.js";

describe("Unblockable public attack consumer", () => {
  it("skips an otherwise eligible blocker and reaches security", async () => {
    cite(
      "comprehensive-0151",
      "12-1: an attack that cannot be blocked proceeds to its declared target",
      "1c4e669751a989f9da2bdc3b1b198b4c2c4a03210f54b17ac1f6ba87faa9a566",
    );
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-042", as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-005", as: "blocker" }], security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityId);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("allows a plain Agumon attack to be blocked by the same printed blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { battleArea: [{ card: "AD1-005", as: "blocker" }], security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const attackerInstanceId = s.perm("attacker").topCard.instanceId;
    const blockerId = s.perm("blocker").permanentId;
    const securityId = s.inst("security").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === attackerInstanceId));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === attackerInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === blockerId)).toBe(true);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([securityId]);
  });
});
