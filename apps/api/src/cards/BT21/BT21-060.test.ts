import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-060.js";
import "../index.js";

describe("BT21-060 Destromon", () => {
  it("uses the engine's stacked-card trash lock for the Digivolving protection", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toEqual({
      kind: "StackTrashLock",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Vemmon"], cost: 6, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("uses this stack's Vemmon cards for the inherited attack-prevention cost", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    const prevent = (inherited?.actions[0] as { actions?: unknown[] } | undefined)?.actions?.[0] as
      | { cost?: unknown }
      | undefined;

    expect(inherited).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn" });
    expect(prevent).toMatchObject({ kind: "EndAttack", optional: true, abortOnDecline: true });
    expect(prevent?.cost).toMatchObject({
      kind: "return",
      to: "deckBottom",
      target: {
        filter: {
          isSelfRef: true,
          controller: "mine",
          zone: "digivolutionCards",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
        },
        count: 2,
      },
    });
  });

  it("scopes the leaving-play revival to this stack's exact Vemmon cards", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0] as
      | { actions?: unknown[] }
      | undefined;

    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
    });
    expect(replacement?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      target: {
        filter: {
          isSelfRef: true,
          controller: "mine",
          nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
        },
      },
    });
  });

  it("scales De-Digivolve by Vemmon cards in this Digimon's stack", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[1]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      scaling: {
        per: 2,
        unit: "digivolutionCards",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
        },
      },
    });
  });

  it("de-digivolves two cards when four Vemmon are in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-060", as: "destromon", under: ["BT21-056", "BT21-056", "BT21-056", "BT21-056"] }],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("destromon"));
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-042");

    expect(s.perm("opponent").stack).toHaveLength(0);
  });

  it("publicly evolves exact Vemmon for 6 and preserves the one-source De-Digivolve boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-056", as: "source" }],
          hand: [{ card: "BT21-060", as: "destromon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("destromon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-060");
    expect(s.state.memory).toBe(1);
    expect(s.perm("opponent").topCard.cardId).toBe("BT21-045");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT21-056"]);
  });

  it("publicly places two Vemmon before the exact-name evolution and applies one De-Digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-056", as: "source" }],
          hand: [
            { card: "BT21-058", as: "helper" },
            { card: "BT21-060", as: "destromon" },
          ],
          trash: [
            { card: "BT21-056", as: "first" },
            { card: "BT21-056", as: "second" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: { battleArea: [{ card: "BT21-045", as: "opponent", under: ["BT21-042", "BT21-044"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").topCard.instanceId, s.inst("first").instanceId, s.inst("second").instanceId);
    s.state.memory = 15;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("helper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").stack.length === 2);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT21-056", "BT21-056"]);
    expect(s.state.memory).toBe(9);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("destromon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-044");
    expect(s.perm("source").topCard.cardId).toBe("BT21-060");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT21-056", "BT21-056", "BT21-056"]);
    expect(s.state.memory).toBe(5);
    expect(s.perm("opponent").stack.map((card) => card.cardId)).toEqual(["BT21-042"]);
  });

  it("Q4563 blocks opponent-effect stack trash while allowing the controller's own effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT21-060",
            as: "destromon",
            under: [
              { card: "BT21-056", as: "first" },
              { card: "BT21-056", as: "second" },
            ],
          },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("destromon"));

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("destromon").permanentId,
      [s.inst("second").instanceId],
      1,
    );
    expect(s.perm("destromon").stack).toHaveLength(2);

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("destromon").permanentId,
      [s.inst("second").instanceId],
      0,
    );
    expect(s.perm("destromon").stack).toHaveLength(1);
  });

  it("plays one Vemmon from its stack without cost when leaving the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-060",
              as: "destromon",
              under: [
                { card: "BT21-056", as: "vemmon" },
                { card: "BT1-009", as: "other" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("destromon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-056"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-060")).toBe(true);
  });

  it("returns exactly two Vemmon to end an opponent's attack before the security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-062",
              as: "host",
              under: [
                { card: "BT21-060", as: "source" },
                { card: "BT21-056", as: "vemmonA" },
                { card: "BT11-061", as: "vemmonB" },
              ],
            },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 2);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-060"]);
  });

  it("Q4564 cannot pay with only one Vemmon, so the attack continues", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-062",
              as: "host",
              under: [
                { card: "BT21-060", as: "source" },
                { card: "BT21-056", as: "vemmon" },
              ],
            },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("vemmon").instanceId)).toBe(true);
  });
});
