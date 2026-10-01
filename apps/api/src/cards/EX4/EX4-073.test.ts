import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./EX4-073.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import { makeInstance } from "../../engine/testkit/harness.js";
import { pushOnStack } from "../../engine/state/access.js";
import "../BT14/BT14-062.js";

describe("EX4-073 Omnimon Alter-B", () => {
  it("matches the catalog and compiled effects", () => {
    expect(getCardDefinition("EX4-073")).toMatchObject({
      cardId: "EX4-073",
      nameEn: "Omnimon Alter-B",
      colors: ["Black"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.isInherited).not.toBe(true);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.optional).toBe(true);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.condition).toMatchObject({
      kind: "selfDigivolutionStackMatchesFilter",
      filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]?.optional).not.toBe(true);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 7, names: ["Omnimon"], cost: 2, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({
      kind: "DeleteBudget",
      minimum: 1,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 3,
      upTo: true,
      minAmount: 1,
      choose: true,
      cardFilter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
    });
  });

  it("digivolves normally from a black level-6 Digimon for 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-004", as: "base" }],
        hand: [{ card: "EX4-073", as: "alterB" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alterB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-073");

    expect(s.state.memory).toBe(0);
  });

  it("digivolves from a level-7 Omnimon in name for 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-084", as: "omnimon" }],
        hand: [{ card: "EX4-073", as: "alterB" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("omnimon").permanentId,
        instanceId: s.inst("alterB").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("omnimon").topCard.cardId === "EX4-073");

    expect(s.state.memory).toBe(0);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-073");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("uses the public When Digivolving path and never exceeds the six-play-cost deletion budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-084", as: "base" }],
          hand: [{ card: "EX4-073", as: "subject" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cost2" },
            { card: "BT1-013", as: "cost3" },
            { card: "BT1-019", as: "cost6" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("subject").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length < 3);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(["BT1-019"]);
  });

  it("uses the public attack path for the full three-material exclusion budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-073", as: "attacker", under: ["EX4-048", "EX4-049", "EX4-051"] }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cost2" },
            { card: "BT1-013", as: "cost3" },
            { card: "BT1-019", as: "cost6" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
  });

  it("publicly deletes the lowest-cost opponent Tamer for one eligible material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-073", as: "attacker", under: ["AD1-004"] }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-088", as: "lowestTamer" },
            { card: "BT1-013", as: "higherDigimon" },
            { card: "BT1-019", as: "highestDigimon" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerId = s.perm("lowestTamer").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === tamerId));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([s.perm("higherDigimon").permanentId, s.perm("highestDigimon").permanentId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("attacker").stack).toHaveLength(0);
  });

  it("Q3522 retries the protected lowest-cost Datamon instead of deleting the next target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-073", as: "attacker", under: ["AD1-004", "AD1-012"] }],
        },
        1: {
          battleArea: [
            { card: "BT14-062", as: "datamon" },
            { card: "AD1-003", as: "costSeven" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.length === 0);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "AD1-003",
      "BT14-062",
    ]);
  });

  it("Q6033 keeps the three-card security condition local to one activation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX4-073",
              as: "attacker",
              under: [{ card: "AD1-004", as: "firstMaterial" }],
            },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-010", as: "secondTarget" },
            { card: "BT1-011", as: "thirdTarget" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.length === 0);

    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    pushOnStack(s.perm("attacker"), makeInstance("AD1-012", 0, true));
    pushOnStack(s.perm("attacker"), makeInstance("BT10-067", 0, true));
    pushOnStack(s.perm("attacker"), makeInstance("AD1-004", 0, true));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length <= 3);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  ex4CardBehaviorTests("EX4-073");
});

describe("EX4-073 Omnimon Alter-B — KB Q&A rulings", () => {
  async function nextDecision(s: ReturnType<typeof setupEngine>, previousId?: string) {
    await settle(() => s.state.pendingDecision !== undefined && s.state.pendingDecision.decisionId !== previousId);
    const pending = s.state.pendingDecision!;
    return s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
  }

  function respond(s: ReturnType<typeof setupEngine>, req: { decisionId: string; kind: string }, ids: string[]) {
    return s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: req.kind as "chooseTargets", instanceIds: ids },
    });
  }

  function attackWith(s: ReturnType<typeof setupEngine>) {
    return s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
  }

  it("must delete at least 1 opponent Digimon with its When Digivolving budget (Q3519)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-073", as: "subject" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cost2" },
            { card: "BT1-013", as: "cost3" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    const resolved = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("subject"));

    const deDigivolve = await nextDecision(s);
    expect(respond(s, deDigivolve, [s.perm("cost6").permanentId])).toEqual({ ok: true });
    const deletion = await nextDecision(s, deDigivolve.decisionId);
    expect(deletion.options).toMatchObject({ min: 1, maxTotalPlayCost: 6 });
    expect(respond(s, deletion, []).ok).toBe(false);
    expect(respond(s, deletion, [s.perm("cost3").permanentId])).toEqual({ ok: true });
    await resolved;
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(["BT1-009", "BT1-019"]);
  });

  it("must trash at least 1 card once its When Attacking effect is activated, and nothing when declined (Q3520)", async () => {
    function board(opts: SetupEngineOptions) {
      return setupEngine(
        {
          0: {
            battleArea: [{ card: "EX4-073", as: "attacker", under: ["BT1-080", "BT8-017"] }],
            security: ["BT1-009", "BT1-010"],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "cost2" },
              { card: "BT1-019", as: "cost6" },
            ],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
        },
        { autoSelectCards: false, ...opts },
      );
    }

    const declined = board({ autoDeclineOptional: true, autoSelectCards: true });
    await declined.ready();
    expect(attackWith(declined)).toEqual({ ok: true });
    await settle(() => !observe(declined.engine).isAttacking());
    expect(declined.perm("attacker").stack).toHaveLength(2);
    expect(declined.state.players[1]!.battleArea).toHaveLength(2);

    const s = board({ autoAcceptOptional: true });
    await s.ready();
    expect(attackWith(s)).toEqual({ ok: true });
    const trashChoice = await nextDecision(s);
    expect(trashChoice.options?.min).toBe(1);
    expect(respond(s, trashChoice, []).ok).toBe(false);
    expect(respond(s, trashChoice, [trashChoice.options!.candidateInstanceIds![0]!])).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.length === 1 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-019"]);
  });

  it("deletes the lowest play cost one at a time for each trashed card (Q3521)", async () => {
    const deletions: string[][] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-073", as: "attacker", under: ["BT1-080", "BT8-017"] }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cost2" },
            { card: "BT1-013", as: "cost3" },
            { card: "BT1-019", as: "cost6" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind === "cardsMoved" && event.deletedPermanents !== undefined) {
            deletions.push(event.deletedPermanents.map(({ cardId }) => cardId));
          }
        },
      },
    );
    await s.ready();

    expect(attackWith(s)).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.length === 0 && s.state.players[1]!.battleArea.length === 1);

    expect(deletions).toEqual([["BT1-009"], ["BT1-013"]]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-019"]);
  });
});
