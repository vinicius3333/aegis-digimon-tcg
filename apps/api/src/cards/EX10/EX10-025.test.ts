import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-025.js";
import "../index.js";

const CARD_ID = "EX10-025";

describe("EX10-025 Sunarizamon", () => {
  it("proves the two-card Mineral/Rock placement and inherited discard trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          from: ["trash"],
          count: 2,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
            },
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardDiscarded",
          sourceFilter: { nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("records the exact catalog and zero-cost black level-2 evolution", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile", "LIBERATOR", "Mineral"],
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-005", as: "base" }], hand: [{ card: CARD_ID, as: "sunari" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sunari").instanceId,
      }),
    ).toEqual({ ok: true });
  });

  it("Q5078 places exactly 2 Mineral/Rock cards under 1 matching host and rejects near matches", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX10-028", as: "mineralHost" },
            { card: "BT1-009", as: "plainHost" },
          ],
          trash: [
            { card: CARD_ID, as: "mineral" },
            { card: "BT13-061", as: "rock" },
            { card: "BT1-010", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("plain").instanceId,
      s.inst("mineral").instanceId,
      s.inst("rock").instanceId,
      s.perm("plainHost").permanentId,
      s.perm("mineralHost").permanentId,
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("mineralHost").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("mineral").instanceId, s.inst("rock").instanceId]),
    );
    expect(s.perm("plainHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("plain").instanceId);
  });

  it("Q5079 places the single available matching card, while refusal moves nothing", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX10-028", as: "host" },
          ],
          trash: [{ card: CARD_ID, as: "only" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.perm("host").permanentId);
    await advance(accepted.engine).fireForPermanent(EffectTiming.OnPlay, accepted.perm("source"));
    expect(accepted.perm("host").stack.map(({ instanceId }) => instanceId)).toContain(accepted.inst("only").instanceId);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX10-028", as: "host" },
          ],
          trash: [{ card: CARD_ID, as: "only" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(declined.engine).fireForPermanent(EffectTiming.OnPlay, declined.perm("source"));
    expect(declined.perm("host").stack).toHaveLength(0);
    expect(declined.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("only").instanceId,
    );
  });

  it("the inherited watcher deletes only cost-4-or-lower after this card is effect-trashed from a Mineral host", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-028", as: "host", under: [{ card: CARD_ID, as: "sunari" }] },
            { card: "BT1-009", as: "plainHost", under: [{ card: CARD_ID, as: "otherSunari" }] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT15-027", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("high").permanentId, s.perm("low").permanentId);
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("sunari").instanceId], 0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("low").instanceId,
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("high").instanceId,
    );

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("plainHost").permanentId,
      [s.inst("otherSunari").instanceId],
      0,
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("high").instanceId,
    );
  });
});
