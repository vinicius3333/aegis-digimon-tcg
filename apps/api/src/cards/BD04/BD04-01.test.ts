import { getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine } from "#api/engine/testkit/harness";
import { syntheticDefinitions } from "#api/engine/testkit/syntheticDefinitions";
import "#api/cards/index";

const cardId = "BD04-01";
const vanillaLeomon = "BT1-042";
const vanillaWithoutLeomon = "BT1-014";
const vanillaBoss = "TEST-BD04-01-BOSS";
const vanillaBeastkin = "TEST-BD04-01-BEASTKIN";

function registerVanillaWithTrait(cardIdForTrait: string, trait: string) {
  syntheticDefinitions.set(cardIdForTrait, {
    ...getCardDefinition(vanillaWithoutLeomon)!,
    cardId: cardIdForTrait,
    imageId: cardIdForTrait,
    nameEn: "Trait Testmon",
    types: [trait],
  });
}

async function memoryGainedWhenDeleted(top: string) {
  const s = setupEngine({ 0: { battleArea: [{ card: top, as: "host", under: [cardId] }] } });
  s.state.memory = 0;
  await s.ready();
  expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
  return s.state.memory;
}

describe("BD04-01 Frimon", () => {
  afterEach(() => {
    syntheticDefinitions.clear();
  });

  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Frimon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser"],
      inheritedEffectText: "[On Deletion] If this Digimon has [Leomon] in its name or the [Boss] trait, gain 1 memory.",
    });
    expect(getCardDefinition(cardId)!.effectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory when a Digimon with [Leomon] in its name is deleted", async () => {
    expect(await memoryGainedWhenDeleted(vanillaLeomon)).toBe(1);
  });

  it("gains 1 memory when a [Boss] trait Digimon is deleted", async () => {
    registerVanillaWithTrait(vanillaBoss, "Boss");
    expect(await memoryGainedWhenDeleted(vanillaBoss)).toBe(1);
  });

  it("gains no memory when the deleted Digimon has neither [Leomon] in its name nor the [Boss] trait", async () => {
    registerVanillaWithTrait(vanillaBeastkin, "Beastkin");
    expect(await memoryGainedWhenDeleted(vanillaWithoutLeomon)).toBe(0);
    expect(await memoryGainedWhenDeleted(vanillaBeastkin)).toBe(0);
  });
});
