import { getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "#api/engine/testkit/harness";
import { syntheticDefinitions } from "#api/engine/testkit/syntheticDefinitions";
import "#api/cards/index";

const cardId = "BD05-09";
const musyamon = "BD05-06";
const redWizard = "BT10-010";
const vanillaPurpleLevel3 = "BT2-067";
const vanillaRedLevel3 = "BT1-009";
const otherTamer = "BT1-085";
const purpleDarkWizard = "TEST-BD05-09-DARK-WIZARD";

function registerPurpleDarkWizard() {
  syntheticDefinitions.set(purpleDarkWizard, {
    ...getCardDefinition(vanillaPurpleLevel3)!,
    cardId: purpleDarkWizard,
    imageId: purpleDarkWizard,
    nameEn: "Dark Wizard Testmon",
    types: ["Dark Wizard"],
  });
}

async function memoryAtMainPhaseWith(digimon: readonly string[]) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: cardId, as: "mukuro" }, ...digimon.map((card, index) => ({ card, as: `digimon${index}` }))],
      deck: [vanillaRedLevel3, vanillaRedLevel3],
    },
  });
  s.state.memory = 3;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  await drainMicrotasks(20);
  const memory = s.state.memory;
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  return memory;
}

async function boardWithMukuro(battleArea: PermanentSpec[], turnSeat: 0 | 1 = 0) {
  const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "mukuro" }, ...battleArea] } });
  s.state.turnSeat = turnSeat;
  await s.ready();
  return s;
}

describe("BD05-09 Mukuro Kasukabe", () => {
  afterEach(() => {
    syntheticDefinitions.clear();
  });

  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD05",
      nameEn: "Mukuro Kasukabe",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["ALYSION"],
      effectText:
        "[Start of Your Main Phase] If you have a purple Digimon with [Wizard] in any of its traits, gain 1 memory.\n[Your Turn] While you have no Digimon other than 1 [Wizard] trait Digimon, all of your Digimon get +2000 DP.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory at the start of the main phase with a purple [Wizard] Digimon", async () => {
    expect(await memoryAtMainPhaseWith([musyamon, vanillaRedLevel3])).toBe(4);
  });

  it("counts a purple Digimon whose trait contains [Wizard]", async () => {
    registerPurpleDarkWizard();
    expect(await memoryAtMainPhaseWith([purpleDarkWizard])).toBe(4);
  });

  it("gains no memory with only a non-purple [Wizard] Digimon or a purple Digimon without the trait", async () => {
    expect(await memoryAtMainPhaseWith([redWizard, vanillaPurpleLevel3])).toBe(3);
  });

  it("gives +2000 DP during your turn while your only Digimon is a [Wizard] trait Digimon", async () => {
    const s = await boardWithMukuro([
      { card: musyamon, as: "musyamon" },
      { card: otherTamer, as: "tamer" },
    ]);

    expect(s.perm("musyamon").currentDP).toBe(7000);
  });

  it("gives no DP while you have another Digimon", async () => {
    const s = await boardWithMukuro([
      { card: musyamon, as: "musyamon" },
      { card: redWizard, as: "secondWizard" },
    ]);

    expect(s.perm("musyamon").currentDP).toBe(5000);
    expect(s.perm("secondWizard").currentDP).toBe(getCardDefinition(redWizard)!.dp);
  });

  it("gives no DP when the only Digimon lacks the exact [Wizard] trait", async () => {
    registerPurpleDarkWizard();
    const s = await boardWithMukuro([{ card: purpleDarkWizard, as: "darkWizard" }]);

    expect(s.perm("darkWizard").currentDP).toBe(3000);
  });

  it("gives no DP during the opponent's turn", async () => {
    const s = await boardWithMukuro([{ card: musyamon, as: "musyamon" }], 1);

    expect(s.perm("musyamon").currentDP).toBe(5000);
  });

  it("plays itself without paying the cost when revealed as a security card", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "mukuro" }] },
        1: { battleArea: [{ card: vanillaRedLevel3, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });
});
