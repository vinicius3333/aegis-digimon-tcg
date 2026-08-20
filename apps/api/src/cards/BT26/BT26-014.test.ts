import { assemblyRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT26-014.js";
import "../index.js";

const CARD_ID = "BT26-014";

describe("BT26-014 Darumamon", () => {
  it("exposes the exact alternate evolution and Assembly recipe", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 4,
      traits: ["Shambala"],
      cost: 3,
      isAlternate: true,
    });
    expect(assemblyRequirementFor(CARD_ID)).toEqual([
      { reduceCost: 2, materials: [{ traits: ["TB"], levelMax: 4, count: 1 }] },
    ]);
  });

  it("assembles with one Lv.4-or-lower TB from trash, pays 5, and keeps it under Darumamon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "darumamon" }],
        trash: [{ card: "BT26-012", as: "material" }],
      },
    });
    s.state.memory = 5;
    const material = s.inst("material").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darumamon").instanceId,
        assembly: { materialInstanceIds: [material] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === CARD_ID));

    const darumamon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    expect(darumamon.stack.map((card) => card.instanceId)).toEqual([material]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it.each([
    ["a Lv.5 TB", "EX12-031"],
    ["a Lv.4 non-TB", "BT1-009"],
  ])("rejects Assembly with %s atomically", (_label, invalidCard) => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "darumamon" }],
        trash: [{ card: invalidCard, as: "invalid" }],
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darumamon").instanceId,
        assembly: { materialInstanceIds: [s.inst("invalid").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([invalidCard]);
  });

  it("digivolves for 3 on an off-color Lv.4 Shambala and deletes exactly a 7000 DP opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-062", as: "purpleShambala" }],
          hand: [{ card: CARD_ID, as: "darumamon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT26-014", as: "exactly7000" },
            { card: "BT1-083", as: "overThreshold", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const exactTarget = s.perm("exactly7000").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleShambala").permanentId,
        instanceId: s.inst("darumamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("purpleShambala").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("overThreshold").permanentId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(exactTarget);
  });

  it("on play deletes a lone eligible opponent and leaves an over-threshold Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "darumamon" }] },
        1: {
          battleArea: [
            { card: "BT26-013", as: "eligible" },
            { card: "BT1-083", as: "tooLarge", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darumamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("tooLarge").permanentId);
  });

  it("Q6969: returns itself on deletion, then still plays an eligible TB from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "darumamon" }],
          hand: [{ card: "BT26-012", as: "playCandidate" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const deleted = s.perm("darumamon").topCard.instanceId;
    const candidate = s.inst("playCandidate").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("darumamon").permanentId])).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === candidate));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(deleted);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("lets its controller independently decline both On Deletion choices", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "darumamon" }],
          hand: [{ card: "BT26-012", as: "handCandidate" }],
          trash: [{ card: "BT26-008", as: "trashCandidate" }],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    const resolving = advance(s.engine).verb.deletePermanent([s.perm("darumamon").permanentId]);

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    let pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    expect(await resolving).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT26-012"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT26-008", CARD_ID]));
  });

  it("its inherited On Deletion plays only an eligible <=6000 DP TB, without returning trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
          hand: [
            { card: "BT26-008", as: "eligible" },
            { card: "EX12-031", as: "tooLarge" },
          ],
          trash: [{ card: "BT26-008", as: "mustStayInTrash" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const eligible = s.inst("eligible").instanceId;
    const trashCard = s.inst("mustStayInTrash").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId])).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === eligible));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX12-031"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(trashCard);
    expect(s.state.memory).toBe(0);
  });
});
