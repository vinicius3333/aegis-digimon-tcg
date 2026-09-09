import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-032.js";

// BT17-032 Kyubimon (Digimon, Lv4, Yellow)
//   [When Digivolving] If you don't have [Rika Nonaka], you may play 1 [Rika Nonaka]
//     from your hand without paying the cost.
//   Inherited [Your Turn][Once Per Turn]: When you use an option card with a cost of 2
//     or more, 1 of your opponent's Digimon gains <Security Attack -1> until the end of
//     their turn.
// Fixtures: Yellow Lv3 source BT1-045 (inert); BT17-085 is Rika Nonaka; BT1-102 and a
// second copy are Yellow cost-2 Options; ST3-13 is a Yellow cost-1 Option; opponents are
// inert Red Digimon BT1-009/BT1-010.
describe("BT17-032", () => {
  it("matches the catalog, printed text, and full IR contract", () => {
    expect(getCardDefinition("BT17-032")).toMatchObject({
      cardId: "BT17-032",
      nameEn: "Kyubimon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Mysterious Beast"],
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] If you don't have [Rika Nonaka], you may play 1 [Rika Nonaka] from your hand without paying the cost.",
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When you use an option card with a cost of 2 or more, 1 of your opponent's Digimon gains ＜Security Attack -1＞until the end of their turn.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rika Nonaka"], match: "nameExact" }] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            condition: {
              kind: "youHaveNone",
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rika Nonaka"], match: "nameExact" }] },
              raw: "you don't have [Rika Nonaka]",
            },
            optional: true,
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: {
              kind: "triggerOptionCostAtLeast",
              value: 2,
              raw: "when you use an Option card with a cost of 2 or more",
            },
            actions: [
              {
                kind: "GainKeyword",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
                duration: "untilOpponentTurnEnd",
              },
            ],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("plays Rika Nonaka for free on a real digivolution when none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "source" }],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const rikaId = s.inst("rika").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rikaId));

    // Kyubimon sits on the Lv3 source; Rika is on the field for free; the free play spent
    // no memory (only the cost-2 digivolve did: 3 -> 1); the digivolve bonus draw landed.
    expect(s.perm("source").topCard.cardId).toBe("BT17-032");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-045"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rikaId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === rikaId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not play Rika on digivolution when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "source" },
            { card: "BT17-085", as: "existing-rika" },
          ],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "hand-rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const handRikaId = s.inst("hand-rika").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT17-032");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handRikaId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-085")).toHaveLength(
      1,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces one opposing Digimon's Security Attack after a real cost-2 Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-033", under: ["BT17-032"], as: "host" }],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => observe(s.engine).hasKeyword(permanent, "SecurityAttack")),
    ).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire the inherited watcher for an Option with a use cost below 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-033", under: ["BT17-032"], as: "host" }],
          hand: [{ card: "ST3-13", as: "cheapOption" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheapOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST3-13"));

    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants the debuff only once per turn even after two cost-2 Option uses", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-033", under: ["BT17-032"], as: "host" }],
          hand: [
            { card: "BT1-102", as: "optionOne" },
            { card: "BT1-102", as: "optionTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetOne" },
            { card: "BT1-010", as: "targetTwo" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optionOne").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optionTwo").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);

    const debuffed = s.state.players[1]!.battleArea.filter((permanent) =>
      observe(s.engine).hasKeyword(permanent, "SecurityAttack"),
    );
    // Exactly one target, at exactly -1: a second fire would either debuff the other
    // Digimon (length 2) or stack on the same one (amount -2).
    expect(debuffed).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(debuffed[0]!, "SecurityAttack")).toBe(-1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays Rika beside a near-miss Tamer peer that does not answer the [Rika Nonaka] gate", async () => {
    // Comparative peer: BT1-087 "T.K. Takaishi" is a Tamer in play but is not a
    // [Rika Nonaka], so "if you don't have [Rika Nonaka]" is still satisfied.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "source" },
            { card: "BT1-087", as: "otherTamer" },
          ],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "rika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const rikaId = s.inst("rika").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rikaId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === rikaId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-087")).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("treats another printing named Rika Nonaka as [Rika Nonaka] and refuses the free play", async () => {
    // The gate is by name, not by card id: EX2-060 is a different Rika Nonaka printing.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "source" },
            { card: "EX2-060", as: "otherRikaPrinting" },
          ],
          hand: [
            { card: "BT17-032", as: "kyubimon" },
            { card: "BT17-085", as: "handRika" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const handRikaId = s.inst("handRika").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("kyubimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT17-032");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handRikaId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-085")).toHaveLength(
      0,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
