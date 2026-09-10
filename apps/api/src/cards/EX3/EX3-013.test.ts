import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX3-013.js";
import "../BT11/BT11-072.js";
import "../BT12/BT12-072.js";
import "../ST1/ST1-16.js";
import "../ST2/ST2-16.js";

describe("EX3-013 Chaosdramon", () => {
  it("has its official dual-color identity and evolution costs", () => {
    expect(getCardDefinition("EX3-013")).toMatchObject({
      cardId: "EX3-013",
      nameEn: "Chaosdramon",
      colors: ["Red", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine"],
      rarity: "SR",
      imageId: "EX3-013",
    });
  });

  it("publishes the placement, de-digivolution, and leave-play replacement clauses", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Machinedramon"], cost: 1, isAlternate: true }]);
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          scaling: { per: 1, usePaidCount: true, unit: "cards" },
          cost: {
            kind: "place",
            target: {
              count: 3,
              upTo: true,
              distinctCardNumbers: true,
              from: ["hand", "trash"],
              filter: { colors: ["Red", "Black"], levels: [5] },
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[1]?.actions).toEqual(compiled.effects[0]?.actions);
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          optional: true,
          cost: {
            kind: "trash",
            target: { count: 2, filter: { isSelfRef: true, kind: ["Digimon"], levels: [5] } },
          },
        },
      ],
    });
  });

  it("publishes a sourced optional action with a player-facing De-Digivolve label", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX3-013", as: "chaosdramon" },
          { card: "BT1-021", as: "eligibleHand" },
          { card: "BT1-020", as: "wrongTrait" },
        ],
        trash: [{ card: "BT2-060", as: "eligibleTrash" }],
      },
      1: { battleArea: [{ card: "BT1-024", under: ["BT1-009"], as: "target" }] },
    });
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaosdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activation = s.state.pendingDecision!;
    const activationRequest = s.decisions.find(({ req }) => req.decisionId === activation.decisionId)!.req;
    expect(activationRequest.sourceCardId).toBe("EX3-013");
    expect(JSON.stringify(JSON.parse(activation.payloadJson))).toContain("De-Digivolve");
  });

  it("Cyborg trait: places up to 3 unique red/black level 5 Cyborgs from hand and trash, then De-Digivolves once per card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-013", as: "chaosdramon" },
            { card: "BT1-021", as: "redCyborg" },
          ],
          trash: [
            { card: "BT2-060", as: "blackCyborgA" },
            { card: "BT2-061", as: "blackCyborgB" },
            { card: "BT1-020", as: "ineligible" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-024",
              under: ["BT1-009", "BT1-019", "BT1-014"],
              as: "target",
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const materialIds = ["redCyborg", "blackCyborgA", "blackCyborgB"].map((alias) => s.inst(alias).instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaosdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT1-009");

    const chaosdramon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-013")!;
    expect(s.state.memory).toBe(0);
    expect(chaosdramon.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-021", "BT2-060", "BT2-061"]),
    );
    expect(chaosdramon.stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(materialIds));
    expect(chaosdramon.stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("ineligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-024", "BT1-014", "BT1-019"]),
    );
  });

  it.each([
    { cards: [], expected: 0 },
    { cards: ["BT1-021"], expected: 1 },
    { cards: ["BT1-021", "BT2-060"], expected: 2 },
    { cards: ["BT1-021", "BT2-060", "BT2-061"], expected: 3 },
  ])("uses the actual paid count for $expected selected material(s)", async ({ cards, expected }) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX3-013", as: "chaosdramon" }, ...cards.map((card, index) => ({ card, as: `m${index}` }))],
        },
        1: {
          battleArea: [{ card: "BT1-024", under: ["BT1-009", "BT1-019", "BT1-014"], as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaosdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-013"));
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-013"));

    expect(s.perm("target").stack).toHaveLength(3 - expected);
  });

  it("offers duplicate copies but enforces different card numbers and places the choices at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", under: ["BT1-009"], as: "base" }],
          hand: [
            { card: "EX3-013", as: "chaosdramon" },
            { card: "BT1-021", as: "copyA" },
            { card: "BT1-021", as: "copyB" },
            { card: "BT2-060", as: "unique" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", under: ["BT1-009", "BT1-019"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-013");
    await settle(() => s.perm("target").stack.length === 0);

    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")?.req;
    expect(selection?.sourceCardId).toBe("EX3-013");
    expect(selection?.options?.timing).toBe("WhenDigivolving");
    expect(selection?.options?.effectText).toContain("De-Digivolve");
    expect(selection?.options?.distinctCardIds).toBe(true);
    expect(selection?.options?.max).toBe(2);
    expect(selection?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("copyA").instanceId, s.inst("copyB").instanceId, s.inst("unique").instanceId]),
    );
    expect(selection?.options?.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("copyA").instanceId, cardId: "BT1-021" },
        { instanceId: s.inst("copyB").instanceId, cardId: "BT1-021" },
        { instanceId: s.inst("unique").instanceId, cardId: "BT2-060" },
      ]),
    );
    expect(
      new Set(
        s
          .perm("base")
          .stack.slice(0, 2)
          .map(({ cardId }) => cardId),
      ),
    ).toEqual(new Set(["BT1-021", "BT2-060"]));
    expect(
      s
        .perm("base")
        .stack.slice(2)
        .map(({ cardId }) => cardId),
    ).toEqual(["BT1-009", "BT1-021"]);
    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "BT1-021")).toHaveLength(1);
  });

  it("does not De-Digivolve when the placement cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-013", as: "chaosdramon" },
            { card: "BT1-021", as: "cyborg" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", under: ["BT1-009"], as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaosdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-013"));
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-013"));

    expect(s.perm("target").topCard.cardId).toBe("BT1-024");
    expect(s.inst("cyborg").cardId).toBe("BT1-021");
  });

  it.each([
    ["red", "BT1-021"],
    ["black", "BT2-060"],
  ])(
    "digivolves from a %s level 5 for the catalogued cost and preserves the source stack",
    async (_color, baseCard) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "EX3-013", as: "chaosdramon" }],
        },
      });
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("chaosdramon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX3-013");
      expect(s.state.memory).toBe(1);
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
    },
  );

  it("supports the alternate Machinedramon route for 1 and rejects an unrelated level 5", async () => {
    const alternate = setupEngine({
      0: {
        battleArea: [{ card: "BT11-072", as: "machinedramon" }],
        hand: [{ card: "EX3-013", as: "chaosdramon" }],
      },
    });
    alternate.state.memory = 2;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("machinedramon").permanentId,
        instanceId: alternate.inst("chaosdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("machinedramon").topCard.cardId === "EX3-013");
    expect(alternate.state.memory).toBe(1);
    expect(alternate.perm("machinedramon").stack.map(({ cardId }) => cardId)).toEqual(["BT11-072"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "notMachinedramon" }],
        hand: [{ card: "EX3-013", as: "chaosdramon" }],
      },
    });
    invalid.state.memory = 2;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("notMachinedramon").permanentId,
        instanceId: invalid.inst("chaosdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(2);
    expect(invalid.perm("notMachinedramon").topCard.cardId).toBe("BT1-038");
  });

  it("trashes exactly 2 level 5 digivolution cards to prevent battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-055", as: "attacker", dp: 13_000 }] },
        1: {
          battleArea: [
            {
              card: "EX3-013",
              under: ["BT1-009", "BT1-021", "BT2-060"],
              as: "chaosdramon",
              suspended: true,
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const chaosId = s.perm("chaosdramon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: chaosId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.trash.filter(({ cardId }) => ["BT1-021", "BT2-060"].includes(cardId)).length === 2,
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(chaosId);
    expect(s.perm("chaosdramon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("is deleted when fewer than 2 level 5 digivolution cards are available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-055", as: "attacker", dp: 13_000 }] },
        1: {
          battleArea: [{ card: "EX3-013", under: ["BT1-009", "BT1-021"], as: "chaosdramon", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const chaosId = s.perm("chaosdramon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: chaosId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX3-013"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(chaosId);
  });

  it("prevents a return to hand by paying the same 2-level-5 cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "blueSource" }],
          hand: [{ card: "ST2-16", as: "cocytusBreath" }],
        },
        1: {
          battleArea: [{ card: "EX3-013", under: ["BT1-021", "BT2-060"], as: "chaosdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const chaosId = s.perm("chaosdramon").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cocytusBreath").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[1]!.trash.filter(({ cardId }) => ["BT1-021", "BT2-060"].includes(cardId)).length === 2,
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(chaosId);
    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "EX3-013")).toBe(false);
  });

  it("prevents a return to the deck and leaves every non-cost stack card in place", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-013", under: ["BT1-009", "BT1-021", "BT2-060"], as: "chaosdramon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const chaosId = s.perm("chaosdramon").permanentId;

    await advance(s.engine).verb.returnToDeck([s.perm("chaosdramon").topCard.instanceId], { toTop: false });
    await settle(
      () => s.state.players[0]!.trash.filter(({ cardId }) => ["BT1-021", "BT2-060"].includes(cardId)).length === 2,
    );

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(chaosId);
    expect(s.perm("chaosdramon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "EX3-013")).toBe(false);
  });

  it("Q2212: resolves the gained deletion trigger before using EX3-013 to prevent leaving play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT12-072",
              under: ["BT1-009", "BT1-021", "BT2-060", "EX3-013"],
              as: "chaosX",
            },
          ],
        },
        1: {
          battleArea: ["BT1-009"],
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const chaosId = s.perm("chaosX").permanentId;
    const securityTopId = s.state.players[1]!.security[0]!.instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(chaosId);
    expect(s.perm("chaosX").topCard.cardId).toBe("BT12-072");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-021", "BT2-060"]);
    expect(s.perm("chaosX").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX3-013"]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityTopId);
  });

  it("Q2213: gains EX3-013's When Digivolving effect as soon as BT12-072 digivolution is confirmed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-013", as: "base" }],
          hand: [
            { card: "BT12-072", as: "chaosX" },
            { card: "BT1-021", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", under: ["BT1-009"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaosX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-009");

    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-021", "EX3-013"]);
    expect(s.perm("base").topCard.cardId).toBe("BT12-072");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("material").instanceId)).toBe(false);
  });
});
