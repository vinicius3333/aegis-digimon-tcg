import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-071.js";
import "../index.js";
describe("BT21-071 Scopemon", () => {
  it("gains memory after placing an Appmon or Three Musketeers card", () => {
    for (const e of compiled.effects.filter((effect) => ["OnPlay", "WhenDigivolving"].includes(effect.trigger)))
      expect(e.actions[0]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place" },
      });
  });

  it("draws 2 and trashes 2 when linked", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects[0]).toEqual({
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      ],
    });
  });

  it("keeps the evolution requirement and complete coverage metadata", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places an Appmon under an own Digimon and gains memory on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [
            { card: "BT21-071", as: "scopemon" },
            { card: "BT21-041", as: "appmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scopemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("appmon").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("appmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore - 3); // play cost 4, then the optional placement gains 1 memory
  });

  it("places a Three Musketeers card from trash at the true bottom and gains memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-071", as: "scopemon" },
            { card: "BT1-009", as: "host", under: [{ card: "BT1-010", as: "existing" }] },
          ],
          trash: [{ card: "BT6-065", as: "musketeer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("musketeer").instanceId, s.perm("host").permanentId);
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("scopemon"));
    await settle(() => s.state.memory === 1);

    expect(s.perm("host").stack[0]?.instanceId).toBe(s.inst("musketeer").instanceId);
    expect(s.perm("host").stack.at(-1)?.instanceId).toBe(s.inst("existing").instanceId);
  });

  it.each([
    ["declined", "BT21-041", true],
    ["nonmatching", "BT1-009", false],
  ] as const)("does not place a card or gain memory when the cost is %s", async (_label, costCard, decline) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-071", as: "scopemon" }],
          hand: [{ card: costCard, as: "cost" }],
        },
      },
      decline
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("scopemon"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });

  it("links for 2, draws two, and trashes exactly two selected hand cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-041", as: "host" }],
          hand: [
            { card: "BT21-071", as: "scopemon" },
            { card: "BT1-009", as: "discardA" },
            { card: "BT1-010", as: "discardB" },
          ],
          deck: [
            { card: "BT1-011", as: "drawA" },
            { card: "BT1-012", as: "drawB" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discardA").instanceId, s.inst("discardB").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("scopemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawA").instanceId, s.inst("drawB").instanceId]),
    );
  });

  it("uses the Three Musketeers-text alternate evolution route for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-054", as: "shotmon" }],
        hand: [{ card: "BT21-071", as: "scopemon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shotmon").permanentId,
        instanceId: s.inst("scopemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shotmon").topCard.instanceId === s.inst("scopemon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("resolves the placement-and-memory branch from a public alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-054", as: "shotmon" }],
          hand: [
            { card: "BT21-071", as: "scopemon" },
            { card: "BT21-041", as: "appmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shotmon").permanentId,
        instanceId: s.inst("scopemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shotmon").topCard.cardId === "BT21-071");

    expect(s.state.memory).toBe(2);
    expect(s.perm("shotmon").stack.some((card) => card.instanceId === s.inst("appmon").instanceId)).toBe(true);
  });
});
