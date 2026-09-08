import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-006.js";

// Trash decoys for "1 [Virus] trait Digimon card with [Greymon] in its name".
const VIRUS_GREYMON = "BT10-019"; // Greymon, Virus — the printed candidate.
const VIRUS_METALGREYMON = "BT1-114"; // MetalGreymon, Virus — "in its name" is a SUBSTRING.
const VACCINE_GREYMON = "BT1-015"; // Greymon, Vaccine — right name, wrong attribute.
const VIRUS_NON_GREYMON = "EX10-006"; // Agumon, Virus — right attribute, wrong name.

// Digivolution sources. EX10-002 is the black Koromon printed alongside this Agumon;
// BT7-004 is a GREEN Koromon, so only the [Digivolve] [Koromon] path can reach it.
const BLACK_KOROMON = "EX10-002";
const GREEN_KOROMON = "BT7-004";
const BLACK_NON_KOROMON_EGG = "BT13-005"; // Dorimon — on colour, wrong name.
const OFF_COLOUR_NON_KOROMON_EGG = "BT1-005"; // Kyaromon — wrong colour and wrong name.

// BT1-014 Kokatorimon is a vanilla Lv.4 red 4000 DP Digimon (no printed or inherited
// text), so any DP above 4000 on a stack topped by it comes from the stack.
const VANILLA_LV4 = "BT1-014";

/** A seat that can sit in a real turn loop: a playable card in hand, security and deck. */
const neutralSeat = () => ({
  hand: ["ST1-02"],
  security: ["BT1-009", "BT1-010", "BT1-011"],
  deck: ["BT1-012", "BT1-013", "BT1-014"],
});

describe("EX10-006 Agumon", () => {
  it("matches the catalog and carries both printed clauses as IR", () => {
    expect(getCardDefinition("EX10-006")).toMatchObject({
      cardId: "EX10-006",
      nameEn: "Agumon",
      colors: ["Red", "Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile"],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(getCardDefinition("EX10-006")!.effectText!.replace(/\s+/g, " ").trim()).toBe(
      "[Digivolve] [Koromon]: Cost 0 [Start of Your Main Phase] You may return 1 [Virus] trait " +
        "Digimon card with [Greymon] in its name from your trash to the hand.",
    );

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // `[Koromon]` brackets the whole name, so the gate is exact, not substring.
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Koromon"], cost: 0, isAlternate: true }]);

    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Return",
          optional: true,
          to: "hand",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              traits: ["Virus"],
              nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
            },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  // --- C2: [Start of Your Main Phase] optional trash return ------------------------

  it("returns the one [Virus] [Greymon] card at the natural start of my main phase", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-006", as: "agumon" }],
          trash: [
            { card: VACCINE_GREYMON, as: "vaccineGreymon" },
            { card: VIRUS_NON_GREYMON, as: "virusAgumon" },
            { card: VIRUS_GREYMON, as: "virusGreymon" },
          ],
        },
        1: { ...neutralSeat(), trash: [{ card: VIRUS_GREYMON, as: "opponentVirusGreymon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Only MY [Virus] + [Greymon] card moved; the three decoys and the opponent's trash
    // are untouched. FAILS WHEN REVERTED: folding `traits` back into a second `nameOrTrait`
    // entry makes that array a UNION and one of the first two decoys becomes eligible.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("virusGreymon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("vaccineGreymon").instanceId,
      s.inst("virusAgumon").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentVirusGreymon").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("accepts MetalGreymon because [Greymon] in its name is a substring match", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-006", as: "agumon" }],
          trash: [{ card: VIRUS_METALGREYMON, as: "metalGreymon" }],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("metalGreymon").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the matching card in the trash when the 'may' is declined", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-006", as: "agumon" }],
          trash: [{ card: VIRUS_GREYMON, as: "virusGreymon" }],
        },
        1: neutralSeat(),
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("virusGreymon").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("virusGreymon").instanceId,
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stays silent at the start of the opponent's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-006", as: "agumon" }],
          trash: [{ card: VIRUS_GREYMON, as: "virusGreymon" }],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    // Refill the trash, then hand the turn over: [Start of YOUR Main Phase] must not fire.
    s.give(0, Zone.Trash, { card: VIRUS_GREYMON, as: "secondGreymon" });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondGreymon").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("opens no decision when the trash holds no legal candidate", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-006", as: "agumon" }],
          trash: [
            { card: VACCINE_GREYMON, as: "vaccineGreymon" },
            { card: VIRUS_NON_GREYMON, as: "virusAgumon" },
          ],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("vaccineGreymon").instanceId,
      s.inst("virusAgumon").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- C1: [Digivolve] [Koromon]: Cost 0 ------------------------------------------

  it.each([
    ["the printed black Koromon", BLACK_KOROMON],
    ["an off-colour green Koromon", GREEN_KOROMON],
  ])("digivolves in breeding from %s for 0 memory", async (_label, egg) => {
    const s = setupEngine({
      0: {
        breeding: { card: egg, as: "egg" },
        hand: [{ card: "EX10-006", as: "agumon" }],
        deck: [{ card: "BT1-012", as: "drawn" }, "BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const agumonId = s.inst("agumon").instanceId;
    const permanentId = s.perm("egg").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: agumonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === agumonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(permanentId);
    expect(s.state.players[0]!.breeding?.stack.map(({ instanceId }) => instanceId)).toEqual([eggId]);
    // The digivolution bonus draw fires in the breeding area too: the hand is the
    // Agumon spent onto the egg, replaced by exactly the top card of the deck.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
  });

  it("still pays the ordinary level 2 cost of 1 when no alternate route is claimed", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: BLACK_KOROMON, as: "egg" },
        hand: [{ card: "EX10-006", as: "agumon" }],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const agumonId = s.inst("agumon").instanceId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: agumonId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === agumonId);

    expect(s.state.memory).toBe(2);
  });

  it.each([
    ["an on-colour egg that is not Koromon", BLACK_NON_KOROMON_EGG],
    ["an off-colour egg that is not Koromon", OFF_COLOUR_NON_KOROMON_EGG],
  ])("refuses the 0-cost route from %s", async (_label, egg) => {
    const s = setupEngine({
      0: {
        breeding: { card: egg, as: "egg" },
        hand: [{ card: "EX10-006", as: "agumon" }],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const eggId = s.inst("egg").instanceId;
    const agumonId = s.inst("agumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: agumonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(eggId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([agumonId]);
  });

  // --- C3: inherited [All Turns] +1000 DP -----------------------------------------

  it("grants +1000 DP the moment it becomes a digivolution card, and none to itself on top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-006", as: "agumon" }],
        hand: [{ card: VANILLA_LV4, as: "host" }],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();
    // While EX10-006 is the TOP card its inherited text is dormant: printed DP only.
    expect(s.perm("agumon").currentDP).toBe(1000);

    s.state.memory = 2;
    const agumonId = s.inst("agumon").instanceId;
    const hostId = s.inst("host").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: hostId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard?.instanceId === hostId);

    expect(s.perm("agumon").stack.map(({ instanceId }) => instanceId)).toEqual([agumonId]);
    expect(s.perm("agumon").currentDP).toBe(getCardDefinition(VANILLA_LV4)!.dp + 1000);
  });

  it("keeps the +1000 DP across a turn boundary, so the duration is not for-the-turn", async () => {
    const s = setupEngine({
      0: { ...neutralSeat(), battleArea: [{ card: VANILLA_LV4, under: ["EX10-006"], as: "carrier" }] },
      1: neutralSeat(),
    });
    const boosted = getCardDefinition(VANILLA_LV4)!.dp + 1000;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("carrier").currentDP).toBe(boosted);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // [All Turns] survives my own turn end. FAILS WHEN REVERTED: a `forTheTurn` duration
    // expires here and the carrier drops back to its printed DP.
    expect(s.perm("carrier").currentDP).toBe(boosted);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not raise a vanilla host that carries no EX10-006 under it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: VANILLA_LV4, as: "bare" },
          { card: VANILLA_LV4, under: ["EX10-006"], as: "carrier" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("bare").currentDP).toBe(getCardDefinition(VANILLA_LV4)!.dp);
    expect(s.perm("carrier").currentDP).toBe(getCardDefinition(VANILLA_LV4)!.dp + 1000);
  });
});
