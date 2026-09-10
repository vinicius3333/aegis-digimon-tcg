import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, PlayerState, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT10/BT10-064.js";
import "../BT10/BT10-065.js";
import { compiled } from "./EX8-048.js";

describe("EX8-048", () => {
  it("matches the catalog identity and printed evolution/effect text", () =>
    expect(getCardDefinition("EX8-048")).toMatchObject({
      cardId: "EX8-048",
      nameEn: "Landramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
      effectText: expect.stringContaining("If you have 1 or fewer Tamers"),
      inheritedEffectText: expect.stringContaining("play cost of 4 or less"),
    }));

  it("exposes the Mineral alternate level-3 evolution route at cost 2", () =>
    expect(digivolutionRequirementsFor("EX8-048")).toContainEqual({
      level: 3,
      traits: ["Mineral"],
      cost: 2,
      isAlternate: true,
    }));

  it("inherits deletion of an opposing play-cost-4-or-less Digimon when trashed from a Mineral/Rock host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardsDiscardedBatch",
      sourceFilter: { isSelfRef: true },
      hostFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
      actions: [
        { kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 } } },
      ],
    }));

  it("plays exactly one Close from hand when digivolving with one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Close"], match: "name" }] }, count: 1 },
      condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], countMax: 1 } },
    }));
  it("plays Close from hand without cost when the digivolving condition is met", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "base" }],
          hand: [
            { card: "EX8-048", as: "source" },
            { card: "EX8-067", as: "close" },
          ],
          deck: [{ card: "BT1-009", as: "draw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067")).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("close").instanceId)).toBe(false);
    expect(player.hand.some((card) => card.instanceId === s.inst("draw").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("keeps Close in hand when the optional When Digivolving play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "base" }],
          hand: [
            { card: "EX8-048", as: "source" },
            { card: "EX8-067", as: "close" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX8-048");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("close").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not play Close when its controller has two Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-048", as: "source" },
            { card: "BT1-087", as: "one" },
            { card: "EX8-067", as: "two" },
          ],
          hand: [{ card: "EX8-067", as: "close" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("close").instanceId)).toBe(true);
  });

  it("allows the Mineral alternate route and rejects a non-Mineral base", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX8-047", as: "mineralBase" }], hand: [{ card: "EX8-048", as: "landramon" }] },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("mineralBase").permanentId,
        instanceId: eligible.inst("landramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("mineralBase").topCard.cardId === "EX8-048");
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "otherBase" }], hand: [{ card: "EX8-048", as: "landramon" }] },
    });
    ineligible.state.memory = 2;
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("otherBase").permanentId,
        instanceId: ineligible.inst("landramon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(ineligible.state.memory).toBe(2);
  });

  it("deletes an opposing low-cost Digimon when trashed from a qualifying host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "host", under: [{ card: "EX8-048", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    await settle(() => (s.state.players[1] as PlayerState).battleArea.length === 0);
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(0);
  });

  it("also triggers from a Mineral host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-047", as: "host", under: [{ card: "EX8-048", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes a play-cost-4 target but not a play-cost-5 target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "host", under: [{ card: "EX8-048", as: "discarded" }] }] },
      1: {
        battleArea: [
          { card: "BT2-057", as: "costFour" },
          { card: "AD1-001", as: "costFive" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "AD1-001")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT2-057")).toBe(false);
  });

  it("does not trigger the inherited deletion from a non-Mineral/Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-065", as: "host", under: [{ card: "EX8-048", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("discarded").instanceId],
      0,
    );
    expect((s.state.players[1] as PlayerState).battleArea).toHaveLength(1);
  });
});
