import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-026.js";
import "../index.js";

function primitivesOf(setup: EngineSetup): Primitives {
  return (setup.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT24-026 Hyogamon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-026")).toMatchObject({
      cardId: "BT24-026",
      nameEn: "Hyogamon",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Ice-Snow", "Titan", "TS", "Demon"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
    });
  });

  it("requires the hand-trash cost before granting Jamming and Blocker", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as unknown as Array<{
        cost?: unknown;
        optional?: boolean;
        abortOnDecline: boolean;
        target: { sameTarget?: boolean };
        keyword: { keyword: string };
      }>;
      expect(actions[0].cost).toMatchObject({ kind: "trash" });
      expect(actions[0].optional).toBeUndefined();
      expect(actions[0].abortOnDecline).toBe(true);
      expect(actions[1].target.sameTarget).toBe(true);
      expect(actions[1].keyword.keyword).toBe("Blocker");
    }
  });

  it("retains the once-per-turn trash-triggered Titamon digivolution", () => {
    const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn") as unknown as {
      actions: Array<{
        sourceFilter: unknown;
        actions: Array<{
          kind: string;
          from: string[];
          payCost: boolean;
          reduceCost: number;
          optional: boolean;
          into: { nameOrTrait: unknown };
        }>;
      }>;
    };
    const action = inherited.actions[0].actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: true,
      reduceCost: 1,
      optional: true,
    });
    expect(action.into.nameOrTrait).toEqual([
      { tokens: ["Titamon"], match: "nameExact" },
      { tokens: ["Titan"], match: "trait" },
    ]);
    expect(inherited.actions[0].sourceFilter).toEqual({ controller: "mine" });
  });

  it("draws only when each trashed copy activates with 5 or fewer cards in hand (Q5607)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT24-026", as: "first" },
          { card: "BT24-026", as: "second" },
          "BT1-009",
          "BT1-010",
          "BT1-011",
          "BT1-012",
          "BT1-013",
        ],
        deck: ["BT1-014", "BT1-015"],
      },
    });
    await s.ready();

    await primitivesOf(s).trash([s.inst("first").instanceId, s.inst("second").instanceId], { byEffectSeat: 0 });
    await settle(() => s.state.players[0]!.hand.length === 6);

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("pays the hand-trash cost and grants both keywords to the same eligible Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-026", as: "hyogamon" },
            { card: "BT24-042", as: "eligible" },
            { card: "BT1-009", as: "ineligible" },
          ],
          hand: [{ card: "BT1-009", as: "cost" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("hyogamon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Blocker")).toBe(false);
  });

  it("runs the hand cost and same-target keyword grants from a public play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-026", as: "hyogamon" },
            { card: "BT1-009", as: "cost" },
          ],
          battleArea: [
            { card: "BT24-042", as: "eligible" },
            { card: "BT1-009", as: "ineligible" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hyogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Blocker")).toBe(false);
  });

  it("refuses the public keyword grant when its hand-trash cost has no card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT24-026", as: "hyogamon" }],
        battleArea: [{ card: "BT24-042", as: "eligible" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hyogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("hyogamon").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(false);
  });

  it("uses public Jamming in a losing security battle after paying the grant cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-026", as: "hyogamon" },
            { card: "BT1-009", as: "cost" },
          ],
          security: [],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: [{ card: "BT1-081", as: "securityDigimon" }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hyogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("hyogamon").topCard.instanceId === s.inst("hyogamon").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("hyogamon"), "Jamming")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hyogamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("hyogamon").permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityDigimon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("shares one use between its on-play and when-attacking timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-026", as: "hyogamon" }],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("hyogamon"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("hyogamon"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("resets the shared public trigger on the owner's later turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-026", as: "hyogamon" },
            { card: "BT24-042", as: "eligible" },
          ],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const attackerId = s.state.players[0]!.battleArea.find(
      (p) => p.topCard?.instanceId === s.inst("hyogamon").instanceId,
    )!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstCost").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstCost").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondCost").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondCost").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });

  it("only inherited-evolves after its owner's hand is trashed and pays 1 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-026"] }],
          hand: [{ card: "BT1-009", as: "ownCost" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
        1: { hand: [{ card: "BT1-010", as: "opponentCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    await primitivesOf(s).trash([s.inst("opponentCost").instanceId], { byEffectSeat: 1 });
    expect(s.perm("host").topCard.cardId).toBe("BT24-072");

    await primitivesOf(s).trash([s.inst("ownCost").instanceId], { byEffectSeat: 0 });
    await settle(() => s.perm("host").topCard.cardId === "P-209");

    expect(s.state.memory).toBe(8);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
  });

  it("does not retroactively open Alliance when public attack-time hand trash evolves the host (Q5606)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["ST16-03", "BT24-026"] }],
          hand: [{ card: "BT1-009", as: "attackTrash" }],
          trash: [{ card: "P-209", as: "titamon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: [{ card: "BT1-013", as: "security" }], deck: ["BT1-014", "BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-209" && !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard.cardId).toBe("P-209");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("attackTrash").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(false);
    expect(s.state.memory).toBe(8);
  });

  it("public inherited evolution retains the exact 072 source stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "host", under: ["BT24-026"] }],
          hand: [
            { card: "BT24-026", as: "discarder" },
            { card: "BT24-026", as: "discarder2" },
            { card: "BT24-026", as: "discarder3" },
            { card: "BT1-009", as: "fodder1" },
            { card: "BT1-010", as: "fodder2" },
            { card: "BT1-011", as: "fodder3" },
            { card: "BT1-012", as: "fodder4" },
            { card: "BT1-019", as: "fodder5" },
          ],
          trash: [
            { card: "P-209", as: "titamon" },
            { card: "BT24-081", as: "next" },
          ],
          deck: [
            { card: "BT1-013", as: "firstEvolutionDraw" },
            { card: "BT1-014", as: "normalDraw" },
            { card: "BT1-015", as: "secondEvolutionDraw" },
            "BT1-016",
            "BT1-017",
            "BT1-018",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    const original072Id = s.perm("host").topCard.instanceId;
    const original026Id = s.perm("host").stack[0]!.instanceId;
    preferred.push(
      s.inst("fodder1").instanceId,
      s.inst("titamon").instanceId,
      s.inst("fodder2").instanceId,
      s.inst("fodder3").instanceId,
      s.inst("fodder4").instanceId,
      s.inst("fodder5").instanceId,
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-209"));
    const host = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "P-209")!;
    expect(host.topCard?.instanceId).toBe(s.inst("titamon").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("firstEvolutionDraw").instanceId);
    const firstMemory = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("fodder3").instanceId));
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("titamon").instanceId);
    expect(s.state.memory).toBe(firstMemory - 4);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder3").instanceId);
    expect(host.stack.map((card) => card.instanceId)).toEqual([original026Id, original072Id]);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("next").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("next").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([
      original026Id,
      original072Id,
      s.inst("titamon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder4").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("normalDraw").instanceId, s.inst("secondEvolutionDraw").instanceId]),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("evolves publicly through the catalog normal blue level-3 route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-031", as: "blueBase" }],
        hand: [{ card: "BT24-026", as: "hyogamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("hyogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueBase").topCard.instanceId === s.inst("hyogamon").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("blueBase").stack.map((card) => card.instanceId)).toEqual([s.inst("blueBase").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("evolves publicly through the alternate TS/Demon route for exactly two memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-021", as: "tsBase" }],
        hand: [{ card: "BT24-026", as: "hyogamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("hyogamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("hyogamon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("tsBase").stack.map((card) => card.instanceId)).toEqual([s.inst("tsBase").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });
});
