import { digiXrosRequirementFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// Fixture vocabulary.
// BT19-076 Luminamon: White Lv.5 named [Luminamon] — the exact-name alternate-evolution base.
// BT19-087 Nene Amano: Black Tamer named [Nene Amano] — the second alternate base and one
//   DigiXros material. Her own [All Turns] clause only fires while she is ON the board.
// BT19-068 Shademon: Purple/Black Lv.4 named [Shademon] — the "w/ [Shademon] under" gate and
//   the second DigiXros material.
// EX10-064 Yuu Amano & Nene Amano: a Tamer whose name CONTAINS "Nene Amano" but is not
//   exactly [Nene Amano] — the near-miss for both the evolution gate and the DigiXros slot.
// BT1-012 Biyomon: inert Red Lv.3, 2000 DP — the chosen host.
// BT1-009 Monodramon: inert Red Lv.3, play cost 2 — the level-4-or-lower source card and the
//   play-cost-5-or-less card under a Tamer.
// BT1-024 MetalTyrannomon: inert Red Lv.5, play cost 7, 10000 DP — the LEVEL near-miss as a
//   digivolution card, the PLAY COST near-miss under a Tamer, and the battle attacker.
// BT1-013 Muchomon: inert Red Lv.3 — deck and security padding (no Digi-Egg in either zone).
const FILLER = ["BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009"];
const SECURITY = ["BT1-013", "BT1-009", "BT1-013"];

function boardCardIds(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "?").sort();
}

describe("BT19-102 Luminamon (Nene Version) — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-102")).toMatchObject({
      cardId: "BT19-102",
      nameEn: "Luminamon (Nene Version)",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Composite", "Xros Heart"],
      maxCountInDeck: 4,
    });
    // Catalog discrepancies (reported, not edited): the record stores a U+00A0 NO-BREAK SPACE
    // inside "[DigiXros -1]", keeps the printed card's own typo "it's digivolution cards" (for
    // "its"), and carries a trailing space after "Cost 3". None change the rules text.
    expect(getCardDefinition("BT19-102")!.effectText).toContain("\u00a0");
    expect(getCardDefinition("BT19-102")!.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve][Luminamon]: Cost 2\n[Digivolve][Nene Amano] w/ [Shademon] under: Cost 3 \n\n[On Play] [When Digivolving] Choose 1 other Digimon. By playing level 4 or lower Digimon card from it's digivolution cards, delete the chosen Digimon.\n[On Deletion] You may play 1 card with a play cost of 5 or less from under any of your Tamers without paying the cost.\n\n[DigiXros -1] [Nene Amano] x [Luminamon] or [Shademon]",
    );
    // A Lv.5 Digimon with a printed evolution cost from every colour at Lv.4 for 4.
    expect(getCardDefinition("BT19-102")!.evoCosts).toHaveLength(7);
  });

  it("publishes both special-evolution gates and both DigiXros material slots", () => {
    // Printed `[Digivolve][Name]` routes are EXACT-name gates (`namesExact`), never the
    // substring `names:` form.
    expect(digivolutionRequirementsFor("BT19-102")).toEqual([
      { namesExact: ["Luminamon"], cost: 2, isAlternate: true },
      {
        namesExact: ["Nene Amano"],
        minNameStackNames: ["Shademon"],
        minNameStackCount: 1,
        cost: 3,
        isAlternate: true,
      },
    ]);
    expect(digiXrosRequirementFor("BT19-102")).toEqual([
      {
        materials: [{ names: ["Nene Amano"] }, { names: ["Luminamon", "Shademon"] }],
        count: 1,
      },
    ]);
  });

  it("compiles all three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-102");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    // The two timing halves of one printed clause compile identically.
    for (const [index, trigger] of [
      [0, "OnPlay"],
      [1, "WhenDigivolving"],
    ] as const) {
      expect(card?.effects[index]).toMatchObject({
        trigger,
        actions: [
          {
            // The leading SelectBind is what makes "the chosen Digimon" one Digimon for both
            // the cost's host and the deletion: without it each action would re-choose.
            kind: "SelectBind",
            target: {
              filter: { controller: "any", kind: ["Digimon"], excludeSelf: true },
              count: 1,
              bindAs: "chosenHost",
            },
          },
          {
            kind: "Delete",
            target: { fromSelectionRef: "chosenHost" },
            // Comprehensive 15-7-4: paying a "by doing X" condition is the controller's choice.
            optional: true,
            cost: {
              kind: "playFromDigivolutionCards",
              hostTarget: { fromSelectionRef: "chosenHost" },
              target: { filter: { levelComparison: { op: "lte", value: 4 }, kind: ["Digimon"] }, count: 1 },
            },
          },
        ],
      });
    }
    expect(card?.effects[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          // "1 CARD", not "1 Digimon card": no `kind` gate. `zone: "underTamers"` plus the
          // scalar `playCostLte` is the loose-card matcher form; the object
          // `playCost: { op, value }` form is silently dropped for loose cards
          // (`matching/definition.ts:148-157`).
          target: { filter: { controller: "mine", playCostLte: 5, zone: "underTamers" }, count: 1 },
          from: ["underTamers"],
          payCost: false,
          optional: true,
        },
      ],
    });
  });
});

describe("BT19-102 Luminamon (Nene Version) — evolution routes", () => {
  it("digivolves from the exact [Luminamon] alternate route for 2, keeping the stack and drawing 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-076", as: "luminamon" }],
          hand: [{ card: "BT19-102", as: "evolving" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const baseInstanceId = s.inst("luminamon").instanceId;
    const topOfDeck = s.state.players[0]!.deck[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("luminamon").permanentId,
        instanceId: s.inst("evolving").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("luminamon").topCard.cardId === "BT19-102");

    expect(s.perm("luminamon").topCard.cardId).toBe("BT19-102");
    // Source-stack identity: the exact base instance is now the single digivolution card.
    expect(s.perm("luminamon").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("luminamon").currentDP).toBe(6000);
    // The alternate route's cost is 2, and the digivolution bonus draw took the top card.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([topOfDeck]);
  });

  it("uses the printed 4-cost Lv.4 evolution route as the ordinary alternative", async () => {
    // The alternate routes are cheaper SPECIAL routes; the printed generic route off any
    // colour's Lv.4 still costs 4 and is what `useAlternateCost` must be discriminated from.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-068", as: "shademon" }],
          hand: [{ card: "BT19-102", as: "evolving" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shademon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shademon").topCard.cardId === "BT19-102");
    // 4 memory for the printed Lv.4 route — not the 2 or 3 of either alternate gate.
    expect(s.state.memory).toBe(0);
  });

  it("digivolves on [Nene Amano] for 3 only while [Shademon] is under her", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-087", as: "nene", under: ["BT19-068"] }],
          hand: [{ card: "BT19-102", as: "luminamon" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 3;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("nene").permanentId,
        instanceId: valid.inst("luminamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("nene").topCard.cardId === "BT19-102");
    expect(valid.perm("nene").topCard.cardId).toBe("BT19-102");
    expect(valid.perm("nene").stack.map((card) => card.cardId)).toEqual(["BT19-068", "BT19-087"]);
    expect(valid.state.memory).toBe(0);

    // Same board, no [Shademon] under her: `minNameStackNames` refuses the route outright.
    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT19-087", as: "nene" }],
        hand: [{ card: "BT19-102", as: "luminamon" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    invalid.state.memory = 3;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nene").permanentId,
        instanceId: invalid.inst("luminamon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("rejects near-name alternate-evolution and DigiXros materials", () => {
    // [Luminamon] is exact: the card's OWN name "Luminamon (Nene Version)" contains it but is
    // not it, so a copy of this very card is not a legal base.
    const nearLuminamon = setupEngine({
      0: {
        battleArea: [{ card: "BT19-102", as: "nearLuminamon" }],
        hand: [{ card: "BT19-102", as: "evolving" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    nearLuminamon.state.memory = 2;
    expect(
      nearLuminamon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nearLuminamon.perm("nearLuminamon").permanentId,
        instanceId: nearLuminamon.inst("evolving").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    // "Yuu Amano & Nene Amano" contains "Nene Amano" and prints no "also treated as" line.
    const nearNene = setupEngine({
      0: {
        battleArea: [{ card: "EX10-064", as: "nearNene", under: ["BT19-068"] }],
        hand: [{ card: "BT19-102", as: "evolving" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    nearNene.state.memory = 3;
    expect(
      nearNene.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nearNene.perm("nearNene").permanentId,
        instanceId: nearNene.inst("evolving").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    const nearNeneMaterial = setupEngine({
      0: {
        hand: [
          { card: "BT19-102", as: "source" },
          { card: "EX10-064", as: "nearNeneMaterial" },
          { card: "BT19-068", as: "shade" },
        ],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    nearNeneMaterial.state.memory = 6;
    expect(
      nearNeneMaterial.engine.applyIntent(0, {
        type: "playCard",
        instanceId: nearNeneMaterial.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [
            nearNeneMaterial.inst("nearNeneMaterial").instanceId,
            nearNeneMaterial.inst("shade").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    const nearLuminamonMaterial = setupEngine({
      0: {
        hand: [
          { card: "BT19-102", as: "source" },
          { card: "BT19-087", as: "nene" },
          { card: "BT19-102", as: "nearLuminamonMaterial" },
        ],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    nearLuminamonMaterial.state.memory = 6;
    expect(
      nearLuminamonMaterial.engine.applyIntent(0, {
        type: "playCard",
        instanceId: nearLuminamonMaterial.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [
            nearLuminamonMaterial.inst("nene").instanceId,
            nearLuminamonMaterial.inst("nearLuminamonMaterial").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("DigiXroses with [Nene Amano] plus either named material, for its printed cost minus 1", async () => {
    for (const second of ["BT19-068", "BT19-076"]) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT19-102", as: "luminamon" },
              { card: "BT19-087", as: "nene" },
              { card: second, as: "second" },
              { card: "BT1-009", as: "spare" },
            ],
            deck: [...FILLER],
            security: [...SECURITY],
          },
          1: { deck: [...FILLER], security: [...SECURITY] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 9;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("luminamon").instanceId,
          digiXros: { materialInstanceIds: [s.inst("nene").instanceId, s.inst("second").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => {
        const permanent = s.state.players[0]!.battleArea.find((candidate) => candidate.topCard.cardId === "BT19-102");
        return permanent?.stack.length === 2;
      });

      const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT19-102");
      // Both materials became digivolution cards under the DigiXrosed Digimon.
      expect(played?.stack.map((card) => card.instanceId).sort()).toEqual(
        [s.inst("nene").instanceId, s.inst("second").instanceId].sort(),
      );
      // ＜DigiXros -1＞ reduces the play cost by 1 FOR EACH card placed (comprehensive
      // 7-2-2-1 / 7-2-3-3), so two materials turn the printed 6 into 4.
      expect(s.state.memory).toBe(5);
    }
  });
});

/**
 * The [On Play] / [When Digivolving] clause. The host is a Biyomon carrying one digivolution
 * card; the clause's cost plays that card, and the deletion must land on the SAME Digimon the
 * SelectBind chose.
 */
function chooseBoard(opts: {
  hostSeat: 0 | 1;
  hostUnder?: string[];
  extraOpponent?: boolean;
  decline?: boolean;
  hostAlias?: string;
}) {
  const host = {
    card: "BT1-012",
    as: opts.hostAlias ?? "chosen",
    under: (opts.hostUnder ?? ["BT1-009"]).map((card, index) => ({ card, as: `material${index}` })),
  };
  const seats = {
    0: {
      hand: [
        { card: "BT19-102", as: "source" },
        { card: "BT1-013", as: "spare" },
      ],
      deck: [...FILLER],
      security: [...SECURITY],
      ...(opts.hostSeat === 0 ? { battleArea: [host] } : {}),
    },
    1: {
      deck: [...FILLER],
      security: [...SECURITY],
      ...(opts.hostSeat === 1
        ? { battleArea: opts.extraOpponent === true ? [host, { card: "BT1-013", as: "bystander" }] : [host] }
        : {}),
    },
  };
  return setupEngine(seats, {
    ...(opts.decline === true ? { autoDeclineOptional: true } : { autoAcceptOptional: true }),
    autoSelectCards: true,
  });
}

describe("BT19-102 Luminamon (Nene Version) — [On Play] [When Digivolving] choose and delete", () => {
  it("plays a level-4-or-lower source out of the OPPONENT's chosen Digimon and deletes it (Q3186)", async () => {
    const s = chooseBoard({ hostSeat: 1, extraOpponent: true });
    s.state.memory = 6;
    await s.ready();
    const chosenTop = s.perm("chosen").topCard.instanceId;
    const bystanderId = s.perm("bystander").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === chosenTop));

    // The digivolution card was PLAYED (it is a permanent now, not trashed with its host).
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("material0").instanceId,
      ),
    ).toBe(true);
    // The bound host — and only it — was deleted; the identical bystander is untouched.
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([chosenTop]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === bystanderId)).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may choose YOUR OWN other Digimon just as well (Q3186)", async () => {
    const s = chooseBoard({ hostSeat: 0 });
    s.state.memory = 6;
    await s.ready();
    const chosenTop = s.perm("chosen").topCard.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === chosenTop));

    // Own Biyomon deleted, its own Monodramon played onto our own board.
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("material0").instanceId,
      ),
    ).toBe(true);
    expect(boardCardIds(s, 0)).toEqual(["BT19-102", "BT1-009"].sort());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([chosenTop]);
  });

  it("is silent when the only Digimon on the board is this one — 'other' excludes itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-102", as: "source" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-102"));

    // It did not choose (and delete) itself: it is still on the board with nothing trashed.
    expect(boardCardIds(s, 0)).toEqual(["BT19-102"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("cannot pay with a level-5 digivolution card, so the chosen Digimon survives", async () => {
    // The only card under the host is MetalTyrannomon (Lv.5): the "level 4 or lower" cost has
    // no payable card, so the deletion it gates never happens.
    const s = chooseBoard({ hostSeat: 1, hostUnder: ["BT1-024"] });
    s.state.memory = 6;
    await s.ready();
    const chosenPermanentId = s.perm("chosen").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-102"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([chosenPermanentId]);
    expect(s.perm("chosen").stack.map((card) => card.instanceId)).toEqual([s.inst("material0").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("declining the By-playing condition leaves the chosen host and its source intact", async () => {
    const s = chooseBoard({ hostSeat: 1, decline: true });
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-102"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-012"]);
    expect(s.perm("chosen").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("fires the same clause off the [When Digivolving] half, on top of a real evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-076", as: "luminamon" }],
          hand: [{ card: "BT19-102", as: "evolving" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-012", as: "chosen", under: [{ card: "BT1-009", as: "material" }] }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const chosenTop = s.perm("chosen").topCard.instanceId;
    const baseInstanceId = s.inst("luminamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("luminamon").permanentId,
        instanceId: s.inst("evolving").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === chosenTop));

    // The clause resolved from the freshly digivolved permanent, whose own stack is intact.
    expect(s.perm("luminamon").topCard.cardId).toBe("BT19-102");
    expect(s.perm("luminamon").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("material").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([chosenTop]);
  });
});

describe("BT19-102 Luminamon (Nene Version) — [On Deletion] free play from under your Tamers", () => {
  /**
   * Seat 1 owns this Digimon and its Tamers; seat 0 is the turn player and attacks into it, so
   * the deletion is a real battle loss rather than an injected timing.
   */
  function deletionBoard(opts: { under: string[]; opponentTamerCard?: string }) {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", as: "attacker" },
            ...(opts.opponentTamerCard === undefined
              ? []
              : [{ card: "BT19-087", as: "theirTamer", under: [{ card: opts.opponentTamerCard, as: "theirs" }] }]),
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT19-102", as: "victim", suspended: true },
            {
              card: "BT19-087",
              as: "tamer",
              under: opts.under.map((card, index) => ({ card, as: `under${index}` })),
            },
          ],
          hand: [{ card: "BT1-009", as: "defenderSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
  }

  function attackVictim(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
    });
  }

  it("plays a cost-5-or-less card from under a Tamer after a real battle deletion", async () => {
    const s = deletionBoard({ under: ["BT1-009"] });
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    const memoryBefore = s.state.memory;

    expect(attackVictim(s)).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("under0").instanceId),
    );

    // 10000 DP beat 6000 DP: the Digimon is gone and its [On Deletion] clause fired.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT19-102")).toBe(true);
    // The card came out from UNDER the Tamer, which now holds nothing.
    expect(s.perm("tamer").stack).toHaveLength(0);
    // Free: the printed cost of 2 moved no memory (the attack's own memory swing aside, the
    // play itself is compared against the value right after the battle).
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("will not play a card whose play cost exceeds 5, nor one under the OPPONENT's Tamer", async () => {
    // Under our Tamer: MetalTyrannomon at play cost 7 — over the ceiling. Under the attacker's
    // Tamer: an eligible cost-2 Monodramon that is not ours to play.
    const s = deletionBoard({ under: ["BT1-024"], opponentTamerCard: "BT1-009" });
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(attackVictim(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-102"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    // Both candidates were refused: each is still sitting under its own Tamer.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("under0").instanceId]);
    expect(s.perm("theirTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("theirs").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT19-087"]);
  });

  it("is optional: declining leaves the card under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT19-102", as: "victim", suspended: true },
            { card: "BT19-087", as: "tamer", under: [{ card: "BT1-009", as: "under0" }] },
          ],
          hand: [{ card: "BT1-009", as: "defenderSpare" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-102"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("under0").instanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT19-087"]);
  });
});
