import { effectiveStaticNames, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { universalNameAliasesFor } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT10/BT10-085.js";
import "../BT23/BT23-013.js";
import "./BT6-015.js";
import "./BT6-082.js";
import "./BT6-084.js";

describe("BT6-084 Sistermon Ciel", () => {
  it("Q1470 treats it as Sistermon Noir and Virus in every zone", () => {
    const definition = getCardDefinition("BT6-084")!;

    expect(effectiveStaticNames(definition)).toEqual(expect.arrayContaining(["Sistermon Ciel", "Sistermon Noir"]));
    expect(definition.attributes).toContain("Virus");
    expect(universalNameAliasesFor("BT6-084")).toContain("Sistermon Noir");
  });

  it("gives Huckmon and Royal Knights +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-084", as: "ciel" },
          { card: "BT6-009", as: "huckmon" },
          { card: "BT6-016", as: "royalKnight" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("huckmon").currentDP).toBe(s.perm("huckmon").baseDP + 2000);
    expect(s.perm("royalKnight").currentDP).toBe(s.perm("royalKnight").baseDP + 2000);
  });

  it("gains one memory on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT6-084", as: "source" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});

async function digivolveIntoJesmonPreferringCiel(withCielInPlay: boolean) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT6-015", as: "base" },
          ...(withCielInPlay ? [{ card: "BT10-085", as: "existingCiel" }] : []),
        ],
        hand: [
          { card: "BT23-013", as: "jesmon" },
          { card: "BT6-084", as: "cielAlsoNoir" },
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
  preferred.push(s.inst("cielAlsoNoir").instanceId);
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
  await settle(() => s.state.players[0]!.battleArea.length === (withCielInPlay ? 3 : 2));
  const playedIds = s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId);
  return { playedIds, cielId: s.inst("cielAlsoNoir").instanceId, blancId: s.inst("blanc").instanceId };
}

describe("BT6-084 Sistermon Ciel — KB Q&A rulings", () => {
  it("cannot be played by BT23-013 Jesmon while a BT10-085 Sistermon Ciel is in play, because it shares that name (Q5224)", async () => {
    const blocked = await digivolveIntoJesmonPreferringCiel(true);
    expect(blocked.playedIds).not.toContain(blocked.cielId);
    expect(blocked.playedIds).toContain(blocked.blancId);

    const control = await digivolveIntoJesmonPreferringCiel(false);
    expect(control.playedIds).toContain(control.cielId);
    expect(control.playedIds).not.toContain(control.blancId);
  });
});
