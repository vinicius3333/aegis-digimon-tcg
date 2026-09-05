import { describe, it, expect } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX7-058.js";

/**
 * A3 — Q1f: EX7-058 (LadyDevimon (X Antibody)) grants one opponent Digimon
 * `[End of Attack] Delete this Digimon.` until the end of that opponent's turn.
 *
 * The focused runtime proof below exercises the canonical GrantAuraToOpponents
 * route through a real play and attack: the granted recipient is deleted at the
 * end of its attack, while an ungranted Digimon remains unaffected.
 */

describe('A3 EX7-058 — granted "[End of Attack] Delete this Digimon."', () => {
  it("uses the canonical Volée & Zerdrücken token identity in both entry effects", () => {
    const tokenEffects = compiled.effects?.filter(
      (effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving",
    );
    expect(tokenEffects).toHaveLength(2);
    expect(tokenEffects?.map((effect) => effect.actions[1])).toEqual([
      expect.objectContaining({ kind: "PlayToken", tokens: ["Volée & Zerdrücken"] }),
      expect.objectContaining({ kind: "PlayToken", tokens: ["Volée & Zerdrücken"] }),
    ]);
  });

  it("accepts an exact LadyDevimon card for the token branch", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-058", as: "lady", under: ["EX6-053"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lady"));
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Volée-&-Zerdrücken"),
    ).toBe(true);
  });

  it("POSITIVE: the granted recipient is deleted after its own attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-058", as: "ladyDevimon" }],
          security: [],
          battleArea: [{ card: "BT1-010", as: "victim", dp: 1000, suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const attackerInstanceId = attacker.topCard!.instanceId;
    const ladyDevimon = s.inst("ladyDevimon");
    const engine = s.engine as unknown as {
      applyIntent: typeof s.engine.applyIntent;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;
    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: ladyDevimon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);
    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g) => g.instanceId === attacker.topCard!.instanceId && g.token === "[End of Attack] Delete this Digimon.",
      ),
    ).toBe(true);

    // Hand the turn to seat 1 for its own attack: the play above spent memory, which ends
    // seat 0's Main phase, so the phase and the gauge are re-armed here too.
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    // The granted EndOfAttack effect must delete the attacking recipient.
    const attackRes = engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.battleArea.length === 0, 1000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerInstanceId);
  });

  it("NEGATIVE: a Digimon that never received the grant also attacks (and suspends) without incident", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-058", as: "ladyDevimon" }],
          security: [],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "bystander" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as {
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    s.state.turnSeat = 1;
    const attackRes = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: bystander.permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => bystander.isSuspended, 1000);
    expect(bystander.isSuspended).toBe(true);
  });
});
