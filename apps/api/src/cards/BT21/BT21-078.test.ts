import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-078.js";
import "../index.js";
describe("BT21-078 WereGarurumon", () => {
  it("deletes level 4 or lower and triggers Alliance plus an attack", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({
            kind: "SubTrigger",
            actions: expect.arrayContaining([expect.objectContaining({ kind: "Attack", optional: true })]),
          }),
        ]),
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { levelComparison: { op: "lte", value: 5 } } },
        condition: { kind: "zoneColorCount", cardType: "Tamer", op: "gte", value: 2 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { levelComparison: { op: "lte", value: 4 } } },
        condition: { kind: "not" },
      });
    }
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Garurumon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["without two Tamer colors", [], "level4"],
    ["with two Tamer colors", ["BT1-085", "BT1-086"], "level5"],
  ] as const)("deletes the correct level cap %s", async (_label, tamers, deletedAlias) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: tamers.map((card, index) => ({ card, as: `tamer${index}` })),
          hand: [{ card: "BT21-078", as: "weregarurumon" }],
        },
        1: {
          battleArea: [
            { card: "BT21-078", as: "level5" },
            { card: "BT21-067", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("level5").permanentId, s.perm("level4").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("weregarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst(deletedAlias).instanceId));

    const survivor = deletedAlias === "level5" ? "level4" : "level5";
    expect(s.state.players[1]!.battleArea.some((card) => card.topCard.instanceId === s.inst(survivor).instanceId)).toBe(
      true,
    );
  });

  it("Q4588/Q4590 mandates Alliance for an ADVENTURE event but allows declining the attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-078", as: "weregarurumon" },
            { card: "BT1-009", as: "allianceTarget" },
          ],
          hand: [{ card: "BT21-057", as: "adventure" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("allianceTarget").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("allianceTarget"), "Alliance"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("allianceTarget").isSuspended).toBe(false);
  });

  it("publicly uses different Digimon for Alliance and the optional attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-078", as: "source" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT21-057", as: "adventure" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("adventure").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("source"), "Alliance"));
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("Q4732 still allows an attack when the played Digimon is not ADVENTURE", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-078", as: "weregarurumon" }],
          hand: [{ card: "BT1-009", as: "other" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("weregarurumon").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(observe(s.engine).hasKeyword(s.perm("weregarurumon"), "Alliance")).toBe(false);
  });

  it("grants inherited Alliance on a realistic evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-067", as: "base" }],
        hand: [
          { card: "BT21-078", as: "source" },
          { card: "ST6-13", as: "host" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-078");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST6-13");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Alliance")).toBe(true);
  });

  it.each([
    ["Garurumon-name", "BT1-036", 0],
    ["ADVENTURE", "BT21-057", 1],
  ] as const)("uses the %s alternate evolution route for 3", async (_label, base, requirementIndex) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT21-078", as: "weregarurumon" }] },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("weregarurumon").instanceId,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("weregarurumon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
