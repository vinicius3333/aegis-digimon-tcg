import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-005.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop turn loop");
  await loop;
}

describe("EX7-005 Kapurimon", () => {
  it("matches the catalog printing and complete inherited IR", () => {
    expect(getCardDefinition("EX7-005")).toMatchObject({
      cardId: "EX7-005",
      nameEn: "Kapurimon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When an effect places an Option card with the [Three Musketeers]\u00a0trait in this Digimon's digivolution cards, gain 1 memory.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "onAddDigivolutionCards",
              sourceFilter: { byEffect: true },
              triggerFilter: { isSelfRef: true },
              addedDigivolutionCardFilter: {
                kind: ["Option"],
                nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
              },
              actions: [{ kind: "GainMemory", amount: 1 }],
              raw: "When an effect places a Three Musketeers Option card in this Digimon's digivolution cards, gain 1 memory",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("does not gain memory for placement without effect provenance", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-048", as: "host", under: ["EX7-005"] }],
        hand: [{ card: "EX7-066", as: "option" }],
      },
    });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("option").instanceId]);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });
  it("inherits a once-per-turn Three Musketeers Option watcher", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { byEffect: true },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: {
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));

  it("publicly gains memory when an effect places a Three Musketeers Option under its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-048", as: "host", under: ["EX7-005"] }],
          hand: [{ card: "EX7-066", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === optionId));

    expect(s.state.memory).toBe(5);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX7-066", "EX7-005"]);
  });

  it("ignores another stack and non-matching cards without consuming its once-per-turn use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-048", as: "host", under: ["EX7-005"] },
            { card: "BT1-009", as: "other" },
          ],
          hand: [
            { card: "EX7-066", as: "otherOption" },
            { card: "BT1-104", as: "plainOption" },
            { card: "EX7-059", as: "musketeerDigimon" },
            { card: "EX7-066", as: "first" },
            { card: "EX7-070", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const place = async (host: string, card: string) => {
      await advance(s.engine).verb.placeUnder(s.perm(host).permanentId, [s.inst(card).instanceId]);
      expect(s.perm(host).stack.some((source) => source.instanceId === s.inst(card).instanceId)).toBe(true);
    };

    await place("other", "otherOption");
    expect(s.state.memory).toBe(2);
    await place("host", "plainOption");
    expect(s.state.memory).toBe(2);
    await place("host", "musketeerDigimon");
    expect(s.state.memory).toBe(2);
    for (const [card, expected] of [
      ["first", 5],
      ["second", 4],
    ] as const) {
      s.state.memory = 10;
      const optionId = s.inst(card).instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.perm("host").stack.some((source) => source.instanceId === optionId));
      expect(s.perm("host").stack.some((source) => source.instanceId === optionId)).toBe(true);
      expect(s.state.memory).toBe(expected);
    }
  });

  it("resets its once-per-turn memory gain after a completed opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-048", as: "host", under: ["EX7-005"] }],
          hand: [
            { card: "EX7-066", as: "first" },
            { card: "EX7-066", as: "second" },
            { card: "EX7-066", as: "third" },
          ],
          deck: ["BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    const play = async (alias: string, expectedMemory: number) => {
      const optionId = s.inst(alias).instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
      await settle(() => s.perm("host").stack.some((card) => card.instanceId === optionId));
      expect(s.state.memory).toBe(expectedMemory);
    };

    await play("first", 5);
    s.state.memory = 10;
    await play("second", 4);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    await play("third", 5);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX7-066", "EX7-066", "EX7-066", "EX7-005"]);
    await stopLoop(s, loop, 0);
  });

  it("does not gain memory when a real Option effect places itself under another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-054", as: "host", under: ["EX7-005"] },
            { card: "EX7-048", as: "other" },
          ],
          hand: [{ card: "EX7-066", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.perm("other").stack.some((card) => card.instanceId === optionId));
    expect(s.perm("other").stack.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("does not gain memory during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-011", as: "host", under: ["EX7-005"] }],
          hand: [{ card: "EX7-066", as: "option" }],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = -2;
    await advance(s.engine).recompute();

    // No public card in this lane opens an opponent-turn placement under this host. Use the
    // named production provenance seam to model an effect-owned placement; the Your Turn
    // gate must still reject it while the opponent owns the turn.
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(0, ["Digimon"], s.perm("host").permanentId);
    try {
      await driver.verb.placeUnder(s.perm("host").permanentId, [s.inst("option").instanceId]);
    } finally {
      driver.verb.leaveEffectResolution();
    }

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(-2);
  });
});
