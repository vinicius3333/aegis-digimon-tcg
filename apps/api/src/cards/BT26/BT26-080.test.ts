import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-080.js";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-080 compiled behavior", () => {
  it("proves dual-card keywords and Bacchusmon evolution", () => {
    expect(getCardDefinition("BT26-080")).toMatchObject({
      nameEn: "Bacchusmon",
      colors: ["Purple", "Green"],
      kinds: ["Digimon", "Option"],
      level: 6,
      playCost: 5,
      dp: 13000,
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
      isDualCard: true,
      dualEffect: "Reversal of the Dead",
      optionColorRequirements: ["Purple"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Bacchusmon"], basePlayCost: 12, cost: 2, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor("BT26-080")).toEqual(compiled.digivolutionRequirement);
    expect(compiled.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
        expect.objectContaining({ keyword: "Succession" }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Attack",
          withoutSuspending: true,
          cost: { kind: "suspend", target: { filter: { kind: ["Digimon"] }, count: 1 } },
        },
      ],
    });
    expect(
      compiled.effects.find((effect) => effect.trigger === "Static" && effect.actions?.[0]?.kind === "GrantStatic"),
    ).toMatchObject({
      actions: [
        {
          grant: "effects",
          filter: { nameOrTrait: [{ tokens: ["Bacchusmon"], match: "nameExact" }] },
        },
      ],
    });
    expect(compiled.effects.slice(2)).toMatchObject([
      {
        trigger: "Static",
        actions: [{ kind: "GrantStatic", grant: "effects", topmostOnly: true, duration: "permanent" }],
      },
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }] },
      {
        trigger: "Main",
        actions: [
          { kind: "Unsuspend", target: { filter: { kind: ["Digimon"] }, count: 1 }, optional: true },
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], suspended: false, superlative: "lowestDP" },
              count: "all",
            },
          },
        ],
      },
    ]);
  });

  it("digivolves for 2 from a play-cost-12 Bacchusmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-077", as: "bacchusmon" }],
        hand: [{ card: "BT26-080", as: "dual" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bacchusmon").permanentId,
        instanceId: s.inst("dual").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bacchusmon").topCard.cardId === "BT26-080");
    expect(s.state.memory).toBe(0);
  });

  it("uses Succession to gain the topmost Bacchusmon card's On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-080", as: "dual", under: [{ card: "BT25-077", as: "successionSource" }] }],
          hand: [{ card: "BT26-009", as: "smallTs" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dual"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-009");
  });

  it("encodes Q7112 as a source-relative live orientation filter", () => {
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], sameOrientationAsSource: true } },
    });
  });

  it("deletes only an opposing Digimon with the same live orientation", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-080", as: "source", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "same", suspended: true },
            { card: "BT1-011", as: "different", suspended: false },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-011")).toBe(true);
  });

  it("shares the orientation deletion once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-080", as: "source", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", suspended: true },
            { card: "BT1-011", as: "second", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q7113 may suspend an opponent's Digimon to attack without suspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-080", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponentCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentCost").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("Q7113 may suspend your Digimon and still attack without suspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-080", as: "source" },
            { card: "BT1-009", as: "ownCost" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownCost").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("ownCost").isSuspended).toBe(true);
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("uses the DUAL Option with a TS use requirement and may unsuspend either player's Digimon (Q7114)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-086", as: "ts" }],
          hand: [{ card: "BT26-080", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentSuspended", suspended: true, dp: 3000 },
            { card: "BT1-080", as: "opponentHigher", suspended: false, dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-080"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-080"]);
  });

  it("enforces the DUAL Option's Purple color requirement when no TS card is in play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-080", as: "option" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("Q7114 may unsuspend your Digimon before deleting all opposing lowest-DP unsuspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-086", as: "ts" },
            { card: "BT1-009", as: "ownSuspended", suspended: true },
          ],
          hand: [{ card: "BT26-080", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowA", dp: 3000 },
            { card: "BT1-011", as: "lowB", dp: 3000 },
            { card: "BT1-080", as: "higher", dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownSuspended").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-080"));

    expect(s.perm("ownSuspended").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-080"]);
  });

  it("performs 2 security checks with Security A. +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-080", as: "source" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
