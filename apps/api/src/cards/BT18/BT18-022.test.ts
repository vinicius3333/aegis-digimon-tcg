import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-022.js";

describe("BT18-022 Kumamon", () => {
  it("keeps the Ice-Snow Rule trait and all timing-specific effect boundaries", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          reduceCost: 1,
          payCost: true,
          into: { colors: ["Red", "Blue"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true }],
        },
      ],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-022", as: "kumamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("kumamon"), "Ice-Snow")).toBe(true);
  });

  it("trashes the bottom 2 digivolution cards when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-022", as: "kumamon" }] },
        1: { battleArea: [{ card: "BT1-030", as: "target", under: ["BT1-001", "BT1-003", "BT1-004"] }] },
      },
      { autoSelectCards: true },
    );
    const bottomIds = s
      .perm("target")
      .stack.slice(0, 2)
      .map((card) => card.instanceId);

    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("kumamon").topCard!);

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-004"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(bottomIds));
  });

  it.each([
    ["Tommy Himi", "BT18-089", 3],
    ["Korikakumon", "BT18-025", 5],
  ])("digivolves from %s with the printed alternate cost", async (_name, baseCard, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-022", as: "kumamon" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-022");

    expect(s.state.memory).toBe(expectedMemory);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
  });

  it("evolves a controlled Digimon for 1 less on its first attack each turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-022", as: "kumamon" },
            { card: "BT18-021", as: "penguinmon" },
          ],
          hand: [{ card: "BT18-023", as: "lanamon" }],
        },
        1: { security: ["BT1-030"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("penguinmon").topCard!.instanceId, s.inst("lanamon").instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kumamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.cardId === "BT18-023");

    expect(s.state.memory).toBe(4);
    expect(s.perm("penguinmon").stack.at(-1)?.cardId).toBe("BT18-021");
  });

  it("plays an inherited-effect Tamer only from its own host stack when the host leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-060", as: "host", under: ["BT18-089", "BT18-022"] },
            { card: "BT1-030", as: "other", under: ["BT18-090"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ownTamerId = s.perm("host").stack.find((card) => card.cardId === "BT18-089")!.instanceId;
    s.perm("host").baseDP = 0;
    s.perm("host").currentDP = 0;

    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownTamerId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownTamerId)).toBe(true);
    expect(s.perm("other").stack.map((card) => card.cardId)).toContain("BT18-090");
  });
});
