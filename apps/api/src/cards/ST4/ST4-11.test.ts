import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import "../ST2/ST2-13.js";
import "./ST4-11.js";
import "./ST4-14.js";

describe("ST4-11 MegaKabuterimon", () => {
  it("trashes the opponent's top security when its host wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST4-13", under: ["ST4-11"], as: "host" }] },
      1: {
        battleArea: [{ card: "ST4-03", as: "victim", suspended: true }],
        security: [{ card: "ST2-13", as: "security" }],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("security").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not win the game when its effect finds an empty security stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["ST4-11"], as: "host", dp: 7000 }] },
      1: { battleArea: [{ card: "ST4-03", as: "victim", suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.gameOver).toBe(false);
  });
});

describe("ST4-11 MegaKabuterimon — KB Q&A rulings", () => {
  // Lillymon hosts the inherited effect because it has no <Piercing>, which would add its own security check.
  function battleWithInheritedHost(opponentSecurity: SeatSpec["security"], ownBattleArea: SeatSpec["battleArea"] = []) {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST4-10", under: ["ST4-11"], as: "host" }, ...(ownBattleArea ?? [])] },
      1: {
        battleArea: [{ card: "ST4-03", as: "victim", suspended: true }],
        security: opponentSecurity,
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("does not activate the [Security] effect of a security card it trashes (Q652)", async () => {
    const s = battleWithInheritedHost(
      [
        { card: "ST4-14", as: "trashedIzzy" },
        { card: "ST4-14", as: "checkedIzzy" },
      ],
      [{ card: "ST4-03", as: "checker" }],
    );
    const isInPlay = (alias: string) =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst(alias).instanceId);
    await settle(() => s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("trashedIzzy").instanceId));
    await drainMicrotasks();
    expect(isInPlay("trashedIzzy")).toBe(false);
    expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual([s.inst("checkedIzzy").instanceId]);

    // Control: the same card flipped by a security check does play itself.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("checker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => isInPlay("checkedIzzy"));
    expect(isInPlay("trashedIzzy")).toBe(false);
  });

  it("does not win the game when its host deletes a Digimon while the opponent's security is empty (Q653)", async () => {
    const s = battleWithInheritedHost([]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.gameOver).toBe(false);

    // Control: the same battle with one security card does fire the effect.
    const control = battleWithInheritedHost([{ card: "ST4-03", as: "security" }]);
    await settle(() =>
      control.state.players[1]!.trash.some((c) => c.instanceId === control.inst("security").instanceId),
    );
    expect(control.state.gameOver).toBe(false);
  });
});
