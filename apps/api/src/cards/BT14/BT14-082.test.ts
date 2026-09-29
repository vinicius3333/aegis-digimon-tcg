import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-082.js";
import { Phase } from "@aegis/shared";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT14-082", () => {
  it("gives a Vaccine Digimon +2000 DP at the start of main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-082", as: "tai" },
          { card: "P-074", as: "vaccine" },
        ],
      },
    });
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
        0: {
          battleArea: [
            { card: "BT14-082", as: "tai" },
            { card: "BT14-071", as: "attacker" },
          ],
        },
        1: { security: ["BT1-009"] },
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
    expect(s.state.memory).toBe(4);
  });
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    }));
  it("plays from the security stack without paying the cost through a natural security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-071", as: "attacker" }] },
        1: { security: [{ card: "BT14-082", as: "securityTai" }] },
      },
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

describe("BT14-082 Tai Kamiya — KB Q&A rulings", () => {
  async function attackIntoSecurity(securityCardId: string) {
    const whenAttackerLeft: { memory: number; taiSuspended: boolean }[] = [];
    let setup: EngineSetup | undefined;
    let attackerPermanentId: string | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-082", as: "tai" },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { security: [securityCardId] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent() {
          if (setup === undefined || attackerPermanentId === undefined || whenAttackerLeft.length > 0) return;
          const battleArea = setup.state.players[0]!.battleArea;
          if (battleArea.some(({ permanentId }) => permanentId === attackerPermanentId)) return;
          whenAttackerLeft.push({ memory: setup.state.memory, taiSuspended: setup.perm("tai").isSuspended });
        },
      },
    );
    setup = s;
    await s.ready();
    s.state.memory = 3;
    attackerPermanentId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    return { s, whenAttackerLeft };
  }

  it("activates only after the checked card's [Security] effect, and before a Security Digimon's battle (Q2455)", async () => {
    // BT2-091's [Security] effect deletes the attacker: Tai has not resolved yet at that point, but does afterwards.
    const securityEffectFirst = await attackIntoSecurity("BT2-091");
    expect(securityEffectFirst.whenAttackerLeft).toEqual([{ memory: 3, taiSuspended: false }]);
    expect(securityEffectFirst.s.perm("tai").isSuspended).toBe(true);
    expect(securityEffectFirst.s.state.memory).toBe(4);

    // BT12-106's [Security] effect suspends Tai first, so he can no longer pay his suspend cost.
    const suspendedBySecurityEffect = await attackIntoSecurity("BT12-106");
    expect(suspendedBySecurityEffect.s.state.players[1]!.security).toHaveLength(0);
    expect(suspendedBySecurityEffect.s.perm("tai").isSuspended).toBe(true);
    expect(suspendedBySecurityEffect.s.state.memory).toBe(3);

    // P-074 (7000 DP) deletes the 3000 DP attacker in battle: Tai has already resolved by then.
    const securityDigimonBattle = await attackIntoSecurity("P-074");
    expect(securityDigimonBattle.whenAttackerLeft).toEqual([{ memory: 4, taiSuspended: true }]);
    expect(securityDigimonBattle.s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([
      "BT14-082",
    ]);
  });
});
