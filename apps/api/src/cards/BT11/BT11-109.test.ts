import { describe, expect, it } from "vitest";
import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../AD1/AD1-025.js";
import { compiled } from "./BT11-109.js";

describe("BT11-109 Astral Snatcher", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-109")).toMatchObject({
      cardId: "BT11-109",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 7,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          { kind: "PlaceUnder" },
          { kind: "SelectBind" },
          {
            kind: "PlaceUnder",
            targetIsPermanent: true,
            position: "bottom",
            shedOwnCards: true,
            target: { fromSelectionRef: "movedDigimon" },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("places Bagra Army trash cards under an own host, then relocates an opposing Digimon under another", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-082", as: "host", under: [{ card: "BT11-077", as: "host-source" }] }],
          trash: [{ card: "BT11-077", as: "material" }],
          hand: [{ card: "BT11-109", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "moved", under: [{ card: "BT1-015", as: "moved-source" }] },
            { card: "BT1-015", as: "destination", under: [{ card: "BT1-010", as: "destination-source" }] },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("material").instanceId) &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("host-source").instanceId,
    ]);
    expect(s.perm("destination").stack.some(({ instanceId }) => instanceId === s.inst("moved").instanceId)).toBe(true);
    expect(s.perm("destination").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("moved").instanceId,
      s.inst("destination-source").instanceId,
    ]);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("moved-source").instanceId)).toBe(
      true,
    );
    expect(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT11-109")
        .map(({ req }) => req.options?.effectTextPart),
    ).toEqual([
      "[Main] You may place up to 3 Digimon cards with [Bagra Army] in their traits from your trash under 1 of your Digimon as its bottom digivolution cards or under 1 of your Tamers.",
      "Then, if you have a Digimon or Tamer with [Bagra Army] in its traits in play, place 1 of your opponent's Digimon under 1 of your opponent's other Digimon as its bottom digivolution card.",
      "Then, if you have a Digimon or Tamer with [Bagra Army] in its traits in play, place 1 of your opponent's Digimon under 1 of your opponent's other Digimon as its bottom digivolution card.",
    ]);
  });
});

describe("BT11-109 Astral Snatcher — KB Q&A rulings", () => {
  const instanceIdsOf = (cards: Iterable<{ instanceId: string }>): string[] =>
    Array.from(cards, ({ instanceId }) => instanceId);

  async function playAstralSnatcher(s: EngineSetup): Promise<void> {
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));
  }

  it("cannot place an opponent's Digimon under another of their Digimon that isn't affected by effects (Q5208)", async () => {
    async function relocateOnto(destinationIsImmune: boolean) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT11-082", as: "bagraArmy" }],
            hand: [{ card: "BT11-109", as: "option" }],
          },
          1: {
            battleArea: [
              { card: "BT1-010", as: "moved" },
              { card: "BT1-015", as: "destination", under: [{ card: "BT1-010", as: "destinationSource" }] },
            ],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("moved").instanceId);
      const movedPermanentId = s.perm("moved").permanentId;
      if (destinationIsImmune) {
        await advance(s.engine).verb.restrict(
          s.perm("destination").permanentId,
          "beAffected",
          EffectDuration.Permanent,
        );
      }
      await playAstralSnatcher(s);
      return {
        movedStillInPlay: s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === movedPermanentId),
        destinationStack: instanceIdsOf(s.perm("destination").stack),
        movedId: s.inst("moved").instanceId,
        destinationSourceId: s.inst("destinationSource").instanceId,
      };
    }

    const immune = await relocateOnto(true);
    expect(immune.movedStillInPlay).toBe(true);
    expect(immune.destinationStack).toEqual([immune.destinationSourceId]);

    const control = await relocateOnto(false);
    expect(control.movedStillInPlay).toBe(false);
    expect(control.destinationStack).toEqual([control.movedId, control.destinationSourceId]);
  });

  // Engine gap: relocatePermanentByEffect never publishes `whenLeavesPlay`, so Omnimon's
  // "when any of your opponent's Digimon leave the battle area" watcher does not trigger.
  it.fails("the placed Digimon leaves the battle area and its digivolution cards are trashed with it (Q5977)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-082", as: "bagraArmy" },
            { card: "AD1-025", as: "omnimon" },
          ],
          hand: [{ card: "BT11-109", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "moved", under: [{ card: "BT1-010", as: "movedSource" }] },
            { card: "BT1-015", as: "destination" },
          ],
          security: [
            { card: "BT1-009", as: "topSecurity" },
            { card: "BT1-009", as: "bottomSecurity" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("moved").instanceId);
    const movedPermanentId = s.perm("moved").permanentId;
    await s.ready();

    await playAstralSnatcher(s);
    await drainMicrotasks(100);

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.map(({ permanentId }) => permanentId)).not.toContain(movedPermanentId);
    expect(instanceIdsOf(s.perm("destination").stack)).toEqual([s.inst("moved").instanceId]);
    expect(instanceIdsOf(opponent.trash)).toEqual(
      expect.arrayContaining([s.inst("movedSource").instanceId, s.inst("topSecurity").instanceId]),
    );
    expect(instanceIdsOf(opponent.security)).toEqual([s.inst("bottomSecurity").instanceId]);
  });
});
