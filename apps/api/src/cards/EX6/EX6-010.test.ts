import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, getCardDefinition, type CardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { compiled } from "./EX6-010.js";
import "../AD1/AD1-018.js";

// A3 for EX6-010 (Durandamon) — Red Lv.6 Digimon (Legend-Arms).
//
// [Your Turn][Inherited] When this Digimon's top card is [RagnaLoardmon] and it is
// attacking, the [Security] effects on cards it checks don't activate.
// Implemented via disableSecurityEffect(perm, "any", UntilEachTurnEnd).
//
// Observable outcome tested here: after recompute(), a RagnaLoardmon permanent with
// Durandamon in its digivolution stack has `isSecurityEffectDisabled(...) === true`
// for any security card kind.
//
const DURANDAMON = "EX6-010";
const RAGNALOARDMON = "BT3-019"; // "RagnaLoardmon" — exact name match for guard
const FILLER = "BT1-009"; // Monodramon — not RagnaLoardmon

function ledger(engine: unknown): ContinuousEffectLedger {
  return (engine as { continuous: ContinuousEffectLedger }).continuous;
}

async function recompute(engine: unknown): Promise<void> {
  await (engine as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
}

/** A minimal CardDefinition stub with Option kind, enough for isSecurityEffectDisabled(). */
function fakeOptionDef(): CardDefinition {
  return {
    cardId: "TEST-OPTION",
    nameEn: "Test Option",
    kinds: [CardKind.Option],
    colors: [],
    types: [],
    playCost: 1,
    level: undefined,
    dp: undefined,
    digivolveRequirement: [],
  } as unknown as CardDefinition;
}

describe("EX6-010 [Inherited] RagnaLoardmon host disables security effects (recompute)", () => {
  it("records disabledSecurityEffect on a RagnaLoardmon host with Durandamon in stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: RAGNALOARDMON, dp: 12000, as: "host", under: [DURANDAMON] }] },
    });

    await recompute(s.engine);

    // The inherited static effect should have recorded a security-effect disable on the host.
    expect(ledger(s.engine).isSecurityEffectDisabled(s.perm("host").permanentId, fakeOptionDef())).toBe(true);
    // FAILS-WHEN-REVERTED: the `disableSecurityEffect` call is removed → no disable recorded → false.
  });

  it("does NOT disable security effects when top card is NOT RagnaLoardmon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: FILLER, dp: 8000, as: "host", under: [DURANDAMON] }] },
    });

    await recompute(s.engine);

    expect(ledger(s.engine).isSecurityEffectDisabled(s.perm("host").permanentId, fakeOptionDef())).toBe(false);
  });

  it("does NOT treat a longer RagnaLoardmon name as the exact host name", async () => {
    const definition = getCardDefinition(RAGNALOARDMON)!;
    const originalName = definition.nameEn;
    definition.nameEn = "RagnaLoardmon: X Antibody";
    try {
      const s = setupEngine({
        0: { battleArea: [{ card: RAGNALOARDMON, dp: 12000, as: "host", under: [DURANDAMON] }] },
      });

      await recompute(s.engine);

      expect(ledger(s.engine).isSecurityEffectDisabled(s.perm("host").permanentId, fakeOptionDef())).toBe(false);
    } finally {
      definition.nameEn = originalName;
    }
  });
});

// A3 for EX6-010's [Hand] [Main] clause: "By paying 3 cost and placing this card as the
// bottom digivolution card of 1 of your Digimon that's level 6 or has the [Legend-Arms]
// trait, delete 1 of your opponent's Digimon with as much or less DP as that Digimon."
//
describe("EX6-010 [Hand] [Main] pay 3, place as bottom digivolution card, delete opponent Digimon", () => {
  it("structurally gates Delete on the complete payment-and-placement activation condition", () => {
    const action = compiled.effects
      .find((effect) => effect.effectKey === "EX6-010/main-place-and-delete")
      ?.actions.at(0);

    expect(action).toMatchObject({ abortOnDecline: true });
  });

  it("places itself under the eligible level-6 host and deletes a lower-DP opponent Digimon, paying 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", dp: 12000, as: "host" }], // WarGreymon, level 6
          hand: [{ card: "EX6-010", as: "durandamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim" }] }, // DP <= host's DP
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    const durandamon = s.inst("durandamon");
    const res = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: durandamon.instanceId,
      effectKey: "EX6-010/main-place-and-delete",
    });
    expect(res).toEqual({ ok: true });

    const victim = s.perm("victim");
    const p1 = s.state.players[1]!;
    await settle(() => !p1.battleArea.some((p) => p.permanentId === victim.permanentId), 600);

    expect(s.perm("host").stack.some((c) => c.instanceId === durandamon.instanceId)).toBe(true);
    expect(s.state.memory).toBe(7); // paid 3 cost
    expect(p1.battleArea.some((p) => p.permanentId === victim.permanentId)).toBe(false);
  });

  it("cannot activate with no eligible placement target (no level-6/Legend-Arms Digimon in play)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "host" }], // level 3, NOT eligible
          hand: [{ card: "EX6-010", as: "durandamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    const durandamon = s.inst("durandamon");
    const res = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: durandamon.instanceId,
      effectKey: "EX6-010/main-place-and-delete",
    });
    expect(res.ok).toBe(false);
  });

  it("places itself under a Legend-Arms host even when that host is below level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-009", as: "host" }],
          hand: [{ card: "EX6-010", as: "durandamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("durandamon").instanceId,
        effectKey: "EX6-010/main-place-and-delete",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("durandamon").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("durandamon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("does not attack a suspended Digimon from When Digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-010", as: "dur", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dur"));
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });

  it("rejects a public attack intent from a Digimon played this turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-010", as: "dur", enteredThisTurn: true }] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dur").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("does not activate a checked Security effect when its RagnaLoardmon host loses the battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-019", as: "ragna", dp: 1000, under: ["EX6-010"] },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { security: [{ card: "AD1-018", as: "securityCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ragna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.every((perm) => perm.topCard?.instanceId !== s.inst("ragna").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ragna").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ally").instanceId)).toBe(
      true,
    );
  });

  it("publicly suppresses a checked Security effect while its RagnaLoardmon host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: RAGNALOARDMON, as: "host", under: [DURANDAMON] }] },
      1: { battleArea: [{ card: FILLER, as: "opponent" }], security: ["BT1-110"] },
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
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("host"), "BT1-110")).toBe(true);
  });
});

describe("EX6-010 [When Digivolving] attack and alternate evolution", () => {
  it("evolves from a level-5 Legend-Arms Digimon and attacks through its public trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-009", as: "base" }],
          hand: [{ card: DURANDAMON, as: "durandamon" }],
        },
        1: { security: [FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("durandamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("base").permanentId,
      ),
    );
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("base").topCard.cardId).toBe(DURANDAMON);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("EX6-009");
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("uses Raid and Piercing to win a public attack and continue the security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: DURANDAMON, as: "durandamon" }] },
        1: { battleArea: [{ card: FILLER, as: "raidTarget", dp: 3000 }], security: [FILLER] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("durandamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
