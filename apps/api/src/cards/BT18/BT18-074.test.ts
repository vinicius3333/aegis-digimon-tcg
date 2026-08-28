import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-074.js";

describe("BT18-074 AncientWisemon", () => {
  it("matches the catalog, full IR, both reveal dispositions, and the exact DigiXros recipe", () => {
    expect(getCardDefinition("BT18-074")).toMatchObject({
      cardId: "BT18-074",
      nameEn: "AncientWisemon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Ancient Mutant", "Ten Warriors"],
    });
    expect(compiled).toMatchObject({
      effects: [
        ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [{ count: 1, to: "play", filter: { colors: ["Black"], playCostLte: 7 } }],
              rest: "trash",
              optional: true,
            },
          ],
        })),
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "Replacement",
              event: "wouldLeavePlay",
              sourceFilter: { isSelfRef: true },
              optional: true,
              actions: [
                {
                  kind: "Modal",
                  choose: 1,
                  options: [
                    [{ kind: "Return", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, to: "hand" }],
                    [
                      {
                        kind: "PlayWithoutCost",
                        fromOwnDigivolutionStack: true,
                        payCost: false,
                        target: { count: 1, filter: { colors: ["Black"], kind: ["Digimon"] } },
                      },
                    ],
                  ],
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digiXrosRequirement: [
        {
          materials: [{ names: ["Mercurymon"] }, { names: ["Sephirothmon"] }],
          count: 2,
        },
      ],
    });
  });

  it("naturally plays a revealed black Tamer and trashes the other revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-074", as: "ancient" }],
          deck: ["BT11-093", "BT18-064", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT11-093"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT11-093")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT18-064", "BT1-028"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("naturally evolves from a black level 5 and resolves the When Digivolving reveal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-068", as: "base" }],
          hand: [{ card: "BT18-074", as: "ancient" }],
          deck: ["BT18-064", "BT11-093", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-074");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-068");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-064")).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT11-093", "BT1-028"]));
    assertNoLoudGap(s);
  });

  it("DigiXroses exactly one Mercurymon and one Sephirothmon for the two -2 reductions", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-074", as: "ancient" },
          { card: "BT18-064", as: "mercurymon" },
          { card: "BT18-066", as: "sephirothmon" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("mercurymon").instanceId, s.inst("sephirothmon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-074"));

    expect(s.perm("ancient").stack.map(({ cardId }) => cardId).sort()).toEqual(["BT18-064", "BT18-066"].sort());
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("rejects a DigiXros declaration with two Mercurymon cards instead of the printed pair", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-074", as: "ancient" },
          { card: "BT18-064", as: "firstMercurymon" },
          { card: "BT18-064", as: "secondMercurymon" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("firstMercurymon").instanceId, s.inst("secondMercurymon").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT18-074", "BT18-064", "BT18-064"]);
  });

  it("naturally replaces battle deletion by playing a level-4 black Digimon from its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-074", as: "ancient", dp: 5000, suspended: true, under: ["BT18-064"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.turnSeat = 1;
    const ancientId = s.perm("ancient").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: ancientId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-064"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === ancientId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-064")).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally replaces battle deletion by returning itself to hand when that modal option is chosen", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-074", as: "ancient", dp: 5000, suspended: true, under: ["BT18-064"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.turnSeat = 1;
    const ancientInstanceId = s.inst("ancient").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ancient").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === ancientInstanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === ancientInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT18-064");
    assertNoLoudGap(s);
  });
});
