import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-053.js";
import "../index.js";

async function resolveRedirectedAttack(s: ReturnType<typeof setupEngine>, repeat = 1): Promise<void> {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  for (let index = 0; index < repeat; index += 1) {
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm(index === 0 ? "attacker" : "attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
  }
  advance(s.engine).endMainPhaseIfOpen(1);
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT26-053 Wolvermon", () => {
  it("encodes Blocker and the All Turns Once Per Turn target-switch cost/use route", () => {
    expect(digivolutionRequirementsFor("BT26-053")).toContainEqual({
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "CostGatedBlock",
              cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
              actions: [
                {
                  kind: "UseOptionWithoutCost",
                  from: ["hand"],
                  payCost: false,
                  selectionRequired: true,
                  filter: {
                    controller: "mine",
                    zone: "hand",
                    kind: ["Option"],
                    playCostLte: 4,
                    nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Blocker" }],
    });
  });

  it("uses the exact level-3 Glowing Dawn evolution and rejects a non-matching level-3 base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-052", as: "base" }],
        hand: [{ card: "BT26-053", as: "wolvermon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 2;
    await legal.ready();

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("wolvermon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "BT26-053");
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT26-053", as: "wolvermon" }],
      },
    });
    invalid.state.memory = 2;
    await invalid.ready();

    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("wolvermon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publicly pays the target-switch trigger with a face-down Tamer card and uses the Glowing Dawn Option", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-053", as: "source" },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
            { card: "BT26-090", as: "tamer2", under: [{ card: "BT1-009", as: "faceDown", faceUp: false }] },
            { card: "BT26-052", as: "host", under: ["BT26-003"] },
          ],
          hand: [{ card: "P-236", as: "option" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT26-014", as: "attacker" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").permanentId);
    await resolveRedirectedAttack(s);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("P-236");
  });

  it("uses only a matching Glowing Dawn Option at the use-cost boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-053", as: "source" },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-010", as: "faceDown", faceUp: false }] },
            { card: "BT26-090", as: "tamer2", under: [{ card: "BT1-009", as: "faceDown", faceUp: false }] },
            { card: "BT26-026", as: "yellowSource" },
            { card: "BT26-052", as: "host", under: ["BT26-003"] },
          ],
          hand: [
            { card: "P-236", as: "valid" },
            { card: "BT25-043", as: "tooExpensive" },
            { card: "BT1-091", as: "wrongTrait" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT26-014", as: "attacker" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").permanentId);
    await resolveRedirectedAttack(s);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT25-043", "BT1-091"]),
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("P-236");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
  });

  it("doesn't use the Option when the exact face-down bottom cost can't be paid", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-053", as: "source" },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-010", as: "faceUp", faceUp: true }] },
            { card: "BT26-090", as: "tamer2", under: [{ card: "BT1-009", as: "faceDown", faceUp: false }] },
            { card: "BT26-052", as: "host", under: ["BT26-003"] },
          ],
          hand: [{ card: "P-236", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT26-014", as: "attacker" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").permanentId);
    await resolveRedirectedAttack(s);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("P-236");
    expect(
      s.state.players[0]!.battleArea.some(({ stack }) => stack.map(({ cardId }) => cardId).includes("BT1-010")),
    ).toBe(true);
  });

  it("requires a matching Option before the target-switch route can use the Tamer cost", () => {
    const action = compiled.effects?.[1]?.actions?.[0];
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttackTargetSwitched",
      actions: [
        {
          kind: "CostGatedBlock",
          actions: [
            {
              kind: "UseOptionWithoutCost",
              filter: { kind: ["Option"], playCostLte: 4, nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
            },
          ],
        },
      ],
    });
  });

  it("publishes one public target-switch use under the Once Per Turn gate", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-053", as: "source" },
            {
              card: "BT26-090",
              as: "tamer",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-010", faceUp: false },
              ],
            },
            { card: "BT26-052", as: "host", under: ["BT26-003"] },
          ],
          hand: [
            { card: "P-236", as: "firstOption" },
            { card: "P-236", as: "secondOption" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT26-014", as: "attacker" },
            { card: "BT26-014", as: "attacker2" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("source").permanentId);
    await resolveRedirectedAttack(s);

    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "P-236")).toHaveLength(1);
  });

  it("publishes Blocker on Wolvermon and through its inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-053", as: "wolvermon" },
          { card: "BT26-055", as: "host", under: ["BT26-053"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("wolvermon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("uses a real opponent attack redirect to publish the target-switched trigger", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-236", as: "option" }],
          battleArea: [
            { card: "BT26-053", as: "source" },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", faceUp: false }] },
            { card: "BT26-090", as: "tamer2", under: [{ card: "BT1-010", faceUp: false }] },
            { card: "BT26-052", as: "redirector", under: ["BT26-003"] },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT26-014", as: "attacker" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await resolveRedirectedAttack(s);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-009");
    expect(s.perm("tamer2").stack.map(({ cardId }) => cardId)).not.toContain("BT1-010");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("P-236");
  });

  it("does not reuse the redirect cost when only one Tamer-stack card is available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-236", as: "option" }],
          battleArea: [
            { card: "BT26-053", as: "source" },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", faceUp: false }] },
            { card: "BT26-052", as: "redirector", under: ["BT26-003"] },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT26-014", as: "attacker" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await resolveRedirectedAttack(s);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("P-236");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("P-236");
  });
});
