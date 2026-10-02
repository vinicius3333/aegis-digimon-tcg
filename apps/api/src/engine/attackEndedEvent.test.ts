import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

type Setup = ReturnType<typeof setupEngine>;

function attackEndedFor(s: Setup, attackerPermanentId: string): number {
  return s.events.filter((event) => event.kind === "attackEnded" && event.attackerPermanentId === attackerPermanentId)
    .length;
}

describe("attackEnded", () => {
  it("closes a player attack that checks no security card (Discord 1555477213594259456)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", as: "opener" },
            { card: "EX13-044", as: "breakdramon", under: ["EX13-008", "EX13-021"] },
          ],
          security: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT13-106", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const opener = s.perm("opener").permanentId;
    const breakdramon = s.perm("breakdramon").permanentId;

    // Odin's Breath's [Security] effect gives every Digimon of the attacker ＜Security Attack -1＞.
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: opener, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => attackEndedFor(s, opener) === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: breakdramon, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => attackEndedFor(s, breakdramon) === 1 && s.state.pendingDecision === undefined);

    const declared = s.events.findIndex(
      (event) => event.kind === "attackDeclared" && event.attackerPermanentId === breakdramon,
    );
    const after = s.events.slice(declared);
    expect(after.some((event) => event.kind === "securityChecked")).toBe(false);
    expect(after.some((event) => event.kind === "combatResolved")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("follows the battle's combatResolved exactly once per attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-024", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attacker = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => attackEndedFor(s, attacker) === 1);

    const kinds = s.events.map((event) => event.kind);
    expect(kinds.indexOf("attackEnded")).toBeGreaterThan(kinds.indexOf("combatResolved"));
    expect(s.events.filter((event) => event.kind === "attackEnded")).toEqual([
      expect.objectContaining({ kind: "attackEnded", seat: 0, attackerPermanentId: attacker }),
    ]);
  });
});
