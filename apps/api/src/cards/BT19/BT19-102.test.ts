import { digiXrosRequirementFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

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
    expect(getCardDefinition("BT19-102")!.effectText).toContain("\u00a0");
    expect(getCardDefinition("BT19-102")!.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve][Luminamon]: Cost 2\n[Digivolve][Nene Amano] w/ [Shademon] under: Cost 3 \n\n[On Play] [When Digivolving] Choose 1 other Digimon. By playing level 4 or lower Digimon card from it's digivolution cards, delete the chosen Digimon.\n[On Deletion] You may play 1 card with a play cost of 5 or less from under any of your Tamers without paying the cost.\n\n[DigiXros -1] [Nene Amano] x [Luminamon] or [Shademon]",
    );
    expect(getCardDefinition("BT19-102")!.evoCosts).toHaveLength(7);
  });

  it("publishes both special-evolution gates and both DigiXros material slots", () => {
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
    for (const [index, trigger] of [
      [0, "OnPlay"],
      [1, "WhenDigivolving"],
    ] as const) {
      expect(card?.effects[index]).toMatchObject({
        trigger,
        actions: [
          {
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
    expect(s.perm("luminamon").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("luminamon").currentDP).toBe(6000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([topOfDeck]);
  });

  it("uses the printed 4-cost Lv.4 evolution route as the ordinary alternative", async () => {
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

  it("rejects near-name Luminamon alternate-evolution and DigiXros materials", () => {
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

  it("accepts Yuu Amano & Nene Amano through its name rule as the alternate-evolution base", () => {
    const ruleNene = setupEngine({
      0: {
        battleArea: [{ card: "EX10-064", as: "ruleNene", under: ["BT19-068"] }],
        hand: [{ card: "BT19-102", as: "evolving" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    ruleNene.state.memory = 3;
    expect(
      ruleNene.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ruleNene.perm("ruleNene").permanentId,
        instanceId: ruleNene.inst("evolving").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
  });

  it("DigiXroses with Yuu Amano & Nene Amano as [Nene Amano] through its name rule", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-102", as: "luminamon" },
            { card: "EX10-064", as: "ruleNene" },
            { card: "BT19-068", as: "second" },
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
        digiXros: { materialInstanceIds: [s.inst("ruleNene").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find((candidate) => candidate.topCard.cardId === "BT19-102");
      return permanent?.stack.length === 2;
    });
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
      expect(played?.stack.map((card) => card.instanceId).sort()).toEqual(
        [s.inst("nene").instanceId, s.inst("second").instanceId].sort(),
      );
      expect(s.state.memory).toBe(5);
    }
  });
});

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

    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("material0").instanceId,
      ),
    ).toBe(true);
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

    expect(boardCardIds(s, 0)).toEqual(["BT19-102"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("cannot pay with a level-5 digivolution card, so the chosen Digimon survives", async () => {
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

    expect(s.perm("luminamon").topCard.cardId).toBe("BT19-102");
    expect(s.perm("luminamon").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("material").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([chosenTop]);
  });
});

describe("BT19-102 Luminamon (Nene Version) — [On Deletion] free play from under your Tamers", () => {
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

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT19-102")).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("will not play a card whose play cost exceeds 5, nor one under the OPPONENT's Tamer", async () => {
    const s = deletionBoard({ under: ["BT1-024"], opponentTamerCard: "BT1-009" });
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(attackVictim(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-102"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
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
