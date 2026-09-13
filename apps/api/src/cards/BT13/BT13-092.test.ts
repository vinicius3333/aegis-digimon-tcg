import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-092.js";

describe("BT13-092 BT13-092", () => {
  it("matches burst timing and the two When Digivolving clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Ravemon"],
      cost: 0,
      isAlternate: true,
      burstDigivolve: { returnTamerNamesExact: ["Keenan Crier"] },
    });
    expect(compiled.effects.some((entry) => entry.trigger === "EndOfYourTurn")).toBe(false);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } },
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "opponent",
          source: "securityTop",
          condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "lte", value: 7 },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], sameNameAsSelection: "returnedDigimon" },
            count: "all",
          },
          optional: true,
          cost: {
            kind: "return",
            bindResultAs: "returnedDigimon",
            target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-092", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-092");
  });

  it("lets the Burst Mode controller choose the opponent hand card and then moves top security to hand when eligible", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-089", as: "ravemon" }],
          hand: [{ card: "BT13-092", as: "burst" }],
        },
        1: {
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    const securityId = s.inst("security").instanceId;
    preferInstanceIds.push(firstId);
    s.state.memory = 10;
    await s.ready();

    const evolutionMaterialId1 = s.perm("ravemon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ravemon").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ravemon").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("ravemon").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("ravemon").topCard?.cardId === "BT13-092");

    expect(s.state.memory).toBe(5);
    const trashIds = s.state.players[1]!.trash.map((card) => card.instanceId);
    const handIds = s.state.players[1]!.hand.map((card) => card.instanceId);
    expect(trashIds).toContain(firstId);
    expect(trashIds).not.toContain(secondId);
    expect(trashIds).not.toContain(securityId);
    expect(handIds).toContain(secondId);
    expect(handIds).toContain(securityId);
    expect(handIds).not.toContain(firstId);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("deletes only opponent Digimon sharing the name returned from their trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-092", as: "ravemon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "same-name-a" },
            { card: "BT1-009", as: "same-name-b" },
            { card: "BT1-010", as: "different-name" },
          ],
          trash: [{ card: "BT1-009", as: "returned" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ravemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("different-name").permanentId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("returned").instanceId)).toBe(true);
  });

  it("rejects a longer Ravemon: Burst Mode host despite an exact payable Keenan Crier", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-092", as: "near-host" },
          { card: "BT13-102", as: "keenan" },
        ],
        hand: [{ card: "BT13-092", as: "burst" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("near-host").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("near-host").topCard.cardId).toBe("BT13-092");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("burst").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("keenan"));
  });

  it("does not apply Burst pending trash to a standard Ravemon: Burst Mode digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-089", as: "base" }],
        hand: [{ card: "BT13-092", as: "card" }],
      },
    });
    s.state.memory = 10;
    const priorTopId = s.perm("base").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-092");
    expect(s.state.memory).toBe(5);
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.perm("base").stack.some((card) => card.instanceId === priorTopId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === priorTopId)).toBe(false);
  });

  it("applies Burst pending trash only after a valid exact Ravemon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-089", as: "base" },
          { card: "BT13-102", as: "keenan" },
        ],
        hand: [{ card: "BT13-092", as: "card" }],
      },
    });
    s.state.memory = 3;
    const priorTopId = s.perm("base").topCard.instanceId;
    const burstTopId = s.inst("card").instanceId;
    const hostId = s.perm("base").permanentId;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-092");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(priorTopId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("keenan").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(s.perm("base").permanentId).toBe(hostId);
    expect(s.perm("base").topCard.instanceId).toBe(priorTopId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(burstTopId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(priorTopId);
  });
});
