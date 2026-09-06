import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-074.js";
import "../index.js";
describe("BT21-074 Satellamon", () => {
  it("protects a Digimon and shares once-per-turn De-Digivolve", () => {
    expect(
      compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving").length,
    ).toBeGreaterThanOrEqual(3);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({ kind: "DeDigivolve", amount: 1, cost: expect.objectContaining({ kind: "trash" }) }),
        ],
      }),
    );
    expect(
      compiled.effects
        .filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")
        .flatMap((effect) => effect.actions)
        .filter((action) => action.kind === "Restrict" && action.restriction === "beReturned"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: expect.objectContaining({ fromSelectionRef: "protectedHost" }),
          cost: expect.objectContaining({ bindHostAs: "protectedHost" }),
        }),
      ]),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
          }),
        ],
      }),
    );
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places an Appmon under a Digimon and protects that Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-074", as: "satellamon" },
            { card: "BT21-070", as: "appmon" },
          ],
          battleArea: [{ card: "BT1-009", as: "host" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("satellamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT21-070"));

    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT21-070");
    expect(s.perm("host").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "cantBeDeDigivolved")).toBe(true);
  });

  it("shares the once-per-turn De-Digivolve budget across evolution and attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-074",
              as: "satellamon",
              under: [
                { card: "BT21-070", as: "costA" },
                { card: "BT21-071", as: "costB" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT21-072",
              as: "target",
              under: [
                { card: "BT21-066", as: "lower" },
                { card: "BT21-063", as: "upper" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("costA").instanceId, s.perm("target").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("satellamon"));
    await settle(() => s.perm("target").topCard.instanceId === s.inst("upper").instanceId);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("satellamon"));

    expect(s.perm("target").topCard.instanceId).toBe(s.inst("upper").instanceId);
    expect(s.perm("satellamon").stack.some((card) => card.instanceId === s.inst("costB").instanceId)).toBe(true);
  });

  it("does not pay the stack-trash cost when the effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-074", as: "satellamon", under: [{ card: "BT21-070", as: "cost" }] }] },
        1: { battleArea: [{ card: "BT21-072", as: "target", under: ["BT21-066"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("satellamon"));
    expect(s.perm("satellamon").stack.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("target").topCard.cardId).toBe("BT21-072");
  });

  it("uses the public attack intent to De-Digivolve an opposing stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-074", as: "satellamon", under: [{ card: "BT21-070", as: "cost" }] }],
        },
        1: {
          battleArea: [{ card: "BT21-072", as: "target", under: ["BT21-066"], suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("target").permanentId;
    const lowerId = s.perm("target").stack[0]!.instanceId;
    preferred.push(s.inst("cost").instanceId, s.perm("target").topCard.instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("satellamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId) ||
        s.perm("target").topCard.cardId === "BT21-066",
    );
    expect(s.perm("satellamon").stack.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
    const target = s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId);
    expect(
      target?.topCard.instanceId === lowerId || s.state.players[1]!.trash.some((c) => c.instanceId === lowerId),
    ).toBe(true);
  });

  it("links for 3 and deletes only the level-4 boundary target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-041", as: "host" }],
          hand: [{ card: "BT21-074", as: "satellamon" }],
        },
        1: {
          battleArea: [
            { card: "BT21-071", as: "level4" },
            { card: "BT21-072", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level4").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("satellamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("level4").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.some((card) => card.topCard.instanceId === s.inst("level5").instanceId)).toBe(
      true,
    );
  });

  it("uses the Three Musketeers-text alternate evolution route for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-071", as: "scopemon" }],
        hand: [{ card: "BT21-074", as: "satellamon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("scopemon").permanentId,
        instanceId: s.inst("satellamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("scopemon").topCard.instanceId === s.inst("satellamon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
