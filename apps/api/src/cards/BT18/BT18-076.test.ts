import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-076.js";

describe("BT18-076 Loweemon", () => {
  it("matches the catalog and full IR digivolution, attack, inherited, and alternate-route contract", () => {
    expect(getCardDefinition("BT18-076")).toMatchObject({
      cardId: "BT18-076",
      nameEn: "Loweemon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Hybrid"],
      attributes: ["Variable"],
      types: ["Warrior"],
      inheritedEffectText:
        "[All Turns] When this Digimon would leave the battle area other than by your effects, you may play 1 Tamer card with inherited effects from this Digimon's digivolution cards without paying the cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { filter: { zone: "hand" }, count: 1 } }],
        },
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 },
              into: { kind: ["Digimon"], colors: ["Yellow", "Purple"] },
              from: ["trash"],
              payCost: true,
              optional: true,
            },
          ],
        },
        {
          trigger: "AllTurns",
          isInherited: true,
          actions: [
            {
              kind: "Replacement",
              event: "wouldLeavePlay",
              leaveCause: "otherThanYourEffect",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Koichi Kimura"], cost: 2, isAlternate: true },
        { names: ["KaiserLeomon"], cost: 0, isAlternate: true },
      ],
    });
  });

  it("naturally draws one and trashes one card when digivolving from a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-075", as: "base" }], hand: [{ card: "BT18-076", as: "lowee" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lowee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-076");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-075");
    assertNoLoudGap(s);
  });

  it("naturally draws one and trashes one card when a Tamer digivolves into Loweemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-076", as: "lowee" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koichi").permanentId,
        instanceId: s.inst("lowee").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-076");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    assertNoLoudGap(s);
  });

  it("naturally digivolves a chosen own Tamer into a purple/yellow Hybrid from trash for its printed cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-076", as: "lowee" },
            { card: "BT7-091", as: "koichi" },
          ],
          trash: ["BT18-077"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lowee").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));
    const decision = s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(decision?.kind).toBe("chooseTargets");
    if (decision?.kind !== "chooseTargets") return;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("koichi").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-077");

    expect(s.state.memory).toBe(7);
    expect(s.perm("koichi").stack.map(({ cardId }) => cardId)).toContain("BT7-091");
    assertNoLoudGap(s);
  });

  it("naturally replaces an opponent-caused battle deletion by playing an inherited-effect Tamer from its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-079", as: "host", dp: 5000, suspended: true, under: ["BT18-076", "BT18-094"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094")).toBe(true);
    assertNoLoudGap(s);
  });
});
