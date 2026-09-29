import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-071.js";

describe("BT9-071 Dracmon", () => {
  it("matches errata and Q1862-Q1865 selection and inherited-evolution IR", () => {
    expect(getCardDefinition("BT9-071")).toMatchObject({
      cardId: "BT9-071",
      nameEn: "Dracmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Undead"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand" }, { to: "trash" }] }],
        },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            {
              kind: "Digivolve",
              payCost: true,
              optional: true,
              into: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] } },
            },
          ],
        },
      ],
    });
  });

  it("adds one eligible card and trashes another from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-071", as: "source" }],
          deck: [{ card: "BT9-073", as: "added" }, { card: "BT9-077", as: "trashed" }, "BT9-070"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((c) => c.instanceId === s.inst("added").instanceId) &&
        player.trash.some((c) => c.instanceId === s.inst("trashed").instanceId),
    );
    expect(player.deck).toHaveLength(1);
  });
});

describe("BT9-071 Dracmon — KB Q&A rulings", () => {
  it("adds the only [Undead]/[Dark Animal] revealed card to hand instead of trashing it (Q1863)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-071", as: "source" }],
          deck: [
            { card: "BT1-015", as: "firstOther" },
            { card: "BT9-077", as: "onlyEligible" },
            { card: "BT1-016", as: "secondOther" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-071") &&
        s.state.pendingDecision === undefined,
    );
    const onlyEligibleId = s.inst("onlyEligible").instanceId;
    const selectionsOfferingIt = s.decisions.filter(
      ({ req }) => req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(onlyEligibleId),
    );
    expect(selectionsOfferingIt).toHaveLength(1);
    expect(player.hand.map((card) => card.instanceId)).toEqual([onlyEligibleId]);
    expect(player.trash).toHaveLength(0);
    expect(player.deck.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("firstOther").instanceId, s.inst("secondOther").instanceId].sort(),
    );
  });

  it("inherited [When Attacking] only digivolves into a trash card whose digivolution requirements are met (Q1864)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-073", as: "attacker", under: ["BT9-071"] }],
          trash: [
            { card: "BT9-079", as: "levelSixUndead" },
            { card: "BT9-077", as: "levelFiveUndead" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const levelSixId = s.inst("levelSixUndead").instanceId;
    const levelFiveId = s.inst("levelFiveUndead").instanceId;
    preferred.push(levelSixId);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId !== "BT9-073");

    expect(s.perm("attacker").topCard?.instanceId).toBe(levelFiveId);
    const offeredCards = s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredCards).not.toContain(levelSixId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([levelSixId]);
    expect(s.state.memory).toBe(2);
  });
});
