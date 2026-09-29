import { effectiveStaticNames, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Filter } from "@aegis/shared";
import { definitionMatches } from "../../engine/effects/interpreter/matching/definition.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT10/BT10-085.js";
import "../BT23/BT23-013.js";
import "../BT6/BT6-015.js";
import "../BT6/BT6-082.js";
import "../BT6/BT6-084.js";
import "./ST12-13.js";

describe("ST12-13 Sistermon Ciel", () => {
  it("is treated as Sistermon Noir and Virus in every zone", () => {
    const definition = getCardDefinition("ST12-13")!;

    expect(effectiveStaticNames(definition)).toEqual(expect.arrayContaining(["Sistermon Ciel", "Sistermon Noir"]));
    expect(definition.attributes).toContain("Virus");
  });

  it("grants Reboot without immediately unsuspending its targets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST12-13", as: "ciel" },
          { card: "ST12-04", as: "huckmon", suspended: true },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("huckmon"), "Reboot")).toBe(true);
    expect(s.perm("huckmon").isSuspended).toBe(true);
  });

  it("grants Reboot to a mixed Huckmon/Royal Knight pool, but not nonmatching Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST12-13", as: "ciel" },
          { card: "ST12-04", as: "huckmon" },
          { card: "ST12-10", as: "jesmon" },
          { card: "ST12-12", as: "sistermon" },
          { card: "ST12-09", as: "volcanomon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("huckmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("jesmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("sistermon"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("volcanomon"), "Reboot")).toBe(false);
  });

  it("reveals 3, adds a Huckmon or Royal Knight and trashes the rest", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST12-13", as: "ciel" }], deck: [{ card: "ST12-10", as: "hit" }, "BT1-001", "BT1-002"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ciel").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("hit").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});

const exactSistermonNoir: Filter = { nameOrTrait: [{ tokens: ["Sistermon Noir"], match: "nameExact" }] };
const traitFilter = (trait: string): Filter => ({ nameOrTrait: [{ tokens: [trait], match: "trait" }] });

async function digivolveIntoJesmonPreferringStarterCiel(withBt10CielInPlay: boolean) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT6-015", as: "base" },
          ...(withBt10CielInPlay ? [{ card: "BT10-085", as: "existingCiel" }] : []),
        ],
        hand: [
          { card: "BT23-013", as: "jesmon" },
          { card: "ST12-13", as: "cielAlsoNoir" },
          { card: "BT6-084", as: "boosterCielAlsoNoir" },
          { card: "BT6-082", as: "blanc" },
        ],
      },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferOptionIndex: 1,
      preferInstanceIds: preferred,
      declineDigiXros: true,
      declinePrompts: ["Attack with this Digimon"],
    },
  );
  preferred.push(s.inst("cielAlsoNoir").instanceId, s.inst("boosterCielAlsoNoir").instanceId);
  s.state.memory = 4;
  await s.ready();

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("jesmon").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.instanceId === s.inst("jesmon").instanceId);
  await settle(() => s.state.players[0]!.battleArea.length === (withBt10CielInPlay ? 3 : 2));
  const playedIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
  return {
    playedIds,
    cielId: s.inst("cielAlsoNoir").instanceId,
    boosterCielId: s.inst("boosterCielAlsoNoir").instanceId,
    blancId: s.inst("blanc").instanceId,
  };
}

describe("ST12-13 Sistermon Ciel — KB Q&A rulings", () => {
  it("is treated as [Sistermon Noir] with the [Virus] trait while in the hand and in the breeding area (Q759)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "ST12-13", as: "handCiel" },
          { card: "BT10-085", as: "plainHandCiel" },
        ],
        breeding: { card: "ST12-13", as: "breedingCiel" },
      },
    });
    await s.ready();

    const handCard = s.state.players[0]!.hand.find((card) => card.instanceId === s.inst("handCiel").instanceId)!;
    const breedingTop = s.state.players[0]!.breeding!.topCard;
    const plainCiel = s.state.players[0]!.hand.find((card) => card.instanceId === s.inst("plainHandCiel").instanceId)!;

    for (const card of [handCard, breedingTop]) {
      const definition = getCardDefinition(card.cardId)!;
      expect(definitionMatches(exactSistermonNoir, definition)).toBe(true);
      expect(definitionMatches(traitFilter("Virus"), definition)).toBe(true);
    }
    expect(observe(s.engine).hasEffectiveTrait(s.state.players[0]!.breeding!, "Virus")).toBe(true);

    const plainDefinition = getCardDefinition(plainCiel.cardId)!;
    expect(definitionMatches(exactSistermonNoir, plainDefinition)).toBe(false);
    expect(definitionMatches(traitFilter("Virus"), plainDefinition)).toBe(false);
  });

  it("has the [Champion] and [Puppet] traits plus [Virus] and [Data] sharing one attribute trait, for 3 traits in total (Q760)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-13", as: "ciel" }] } });
    await s.ready();
    const ciel = s.perm("ciel");

    for (const trait of ["Champion", "Puppet", "Virus", "Data"]) {
      expect(observe(s.engine).hasEffectiveTrait(ciel, trait)).toBe(true);
    }
    expect(observe(s.engine).hasEffectiveTrait(ciel, "Vaccine")).toBe(false);

    const definition = getCardDefinition("ST12-13")!;
    const traitSlots = [definition.forms, definition.attributes, definition.types].filter(
      (slot) => (slot?.length ?? 0) > 0,
    );
    expect(traitSlots).toHaveLength(3);
    expect(definition.forms).toEqual(["Champion"]);
    expect(definition.types).toEqual(["Puppet"]);
    expect(definition.attributes).toEqual(expect.arrayContaining(["Data", "Virus"]));
  });

  it("cannot be played by BT23-013 Jesmon while a BT10-085 Sistermon Ciel is in play, because it shares that name (Q5224)", async () => {
    const blocked = await digivolveIntoJesmonPreferringStarterCiel(true);
    expect(blocked.playedIds).not.toContain(blocked.cielId);
    expect(blocked.playedIds).not.toContain(blocked.boosterCielId);
    expect(blocked.playedIds).toContain(blocked.blancId);

    const control = await digivolveIntoJesmonPreferringStarterCiel(false);
    expect(control.playedIds).toContain(control.cielId);
    expect(control.playedIds).not.toContain(control.blancId);
  });
});
