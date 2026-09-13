import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("Jamming security battle behavior", () => {
  it("does not protect a Jamming attacker from a security option's deletion effect", async () => {
    cite(
      "comprehensive-0227",
      "16-9-1: Jamming prevents deletion from losing a Security Digimon battle, but not deletion by a Security effect",
    );
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST19-07", as: "attacker" }] },
        1: { security: [{ card: "ST1-16", as: "gaiaForce" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").topCard.instanceId;
    const securityId = s.inst("gaiaForce").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === attackerId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(attackerId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityId);
  });

  it("keeps a printed Jamming attacker after losing a stronger security battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST19-07", as: "jamming" }] }, 1: { security: ["BT1-081"] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jamming").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("jamming").permanentId),
    ).toBe(true);
  });

  it("deletes an ordinary attacker after losing the same stronger security battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "plain" }] }, 1: { security: ["BT1-081"] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-009"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("inherits Jamming from AD1-010 and survives the public security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "AD1-010", as: "jamSource" }] }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
