import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-017.js";

describe("BT22-017 Gabumon", () => {
  it("reveals Omnimon text and CS, and requires two field Digimon for inherited DNA digivolution", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 })],
      }),
    );
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(inherited).toMatchObject({ isInherited: true });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      materials: [
        { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
        { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1, zone: "battleArea" },
      ],
      into: { controllerDefault: "mine", kind: ["Digimon"], zone: "hand", hasDnaDigivolutionRequirement: true },
      optional: true,
    });
  });

  it("adds one Omnimon-text card and one distinct CS card while bottoming a miss", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-017", as: "gabumon" }],
          deck: [
            { card: "BT5-086", as: "omnimon" },
            { card: "BT22-010", as: "cs" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("omnimon").instanceId, s.inst("cs").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("omnimon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cs").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("omnimon").instanceId, s.inst("cs").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("DNA digivolves a realistic blue host carrying Gabumon with a green level-4 partner", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", under: ["BT22-017"], as: "host" },
            { card: "BT1-069", as: "partner" },
          ],
          hand: [{ card: "BT12-028", as: "dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-028"));

    const dna = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT12-028");
    expect(dna?.stack.some((card) => card.cardId === "BT22-017")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
