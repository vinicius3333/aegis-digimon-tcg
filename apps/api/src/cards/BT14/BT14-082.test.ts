import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-082.js";
import { Phase } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-082", () => {
  it("gives a Vaccine Digimon +2000 DP at the start of main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-082", as: "tai" }, { card: "P-074", as: "vaccine" }] } });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main && s.perm("vaccine").currentDP === 9000);
    expect(s.perm("vaccine").currentDP).toBe(9000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });

  it("scopes its security-removal watcher to the opponent's security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-082", as: "tai" }, { card: "BT14-071", as: "attacker" }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.perm("tai").isSuspended);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("tai").isSuspended).toBe(true);
  });
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    }));
  it("plays from the security stack without paying the cost through a natural security check", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-071", as: "attacker" }] }, 1: { security: [{ card: "BT14-082", as: "securityTai" }] } },
      { autoOrderTriggers: true, autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-082"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-082")).toBe(true);
  });
});
