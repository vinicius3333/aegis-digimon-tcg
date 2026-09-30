import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT14/BT14-062.js";
import "./BT17-013.js";
import "./BT17-017.js";
import { compiled } from "./BT17-010.js";

describe("BT17-010", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition("BT17-010")).toMatchObject({
      cardId: "BT17-010",
      nameEn: "Growlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less. If this effect didn't delete, this Digimon gets +3000 DP for the turn.",
      inheritedEffectText:
        "[All Turns] While you have 0 or less memory, add 2000 to this Digimon's DP-based deletion effects' maximums.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("registers the mandatory When Digivolving delete-or-DP effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
        },
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3000,
          duration: "forTheTurn",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
  });

  it("registers the inherited DP deletion maximum effect", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
          condition: { kind: "memoryAtMost", value: 0 },
        },
      ],
    });
  });

  it("deletes a legal 4000-DP target on natural digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("rookie").topCard.cardId).toBe("BT17-010");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("rookie").currentDP).toBe(5000);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("gets +3000 DP when natural digivolution has no deletable target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookie").topCard.cardId === "BT17-010");

    expect(s.perm("rookie").currentDP).toBe(8000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("raises another DP deletion threshold from an inherited stack card at memory 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-010", as: "growlmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("growlmon").topCard.cardId).toBe("BT17-013");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("chooses an undeletable target and still gets +3000 DP (Q2719)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT14-062", as: "protected", dp: 4000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookie").currentDP === 8000);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("protected").topCard.cardId).toBe("BT14-062");
    expect(s.perm("rookie").currentDP).toBe(8000);
    expect(s.state.memory).toBe(0);
  });

  it("does not raise another effect's maximum while memory is above 0 (Q2720)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-010", as: "growlmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("growlmon").topCard.cardId === "BT17-013");

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("does not raise a DP-relative deletion threshold (Q2722)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "wargrowlmon", under: ["BT17-010"] }],
          hand: [{ card: "BT17-017", as: "ancient" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 13_000 },
            { card: "BT1-011", as: "control", dp: 12_000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wargrowlmon").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wargrowlmon").topCard.cardId === "BT17-017");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(13_000);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-010");
  });
});

describe("BT17-010 Growlmon — KB Q&A rulings", () => {
  it("must delete a valid 4000-DP target instead of declining it to take +3000 DP (Q2718)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "chosen", dp: 4000 },
            { card: "BT1-011", as: "otherValid", dp: 3000 },
            { card: "BT1-012", as: "tooStrong", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    const targetPrompt = s.decisions.at(-1)!.req;
    expect(targetPrompt).toMatchObject({ kind: "chooseTargets", options: { min: 1, max: 1 } });
    expect([...(targetPrompt.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.perm("chosen").permanentId, s.perm("otherValid").permanentId].sort(),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetPrompt.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetPrompt.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-011", "BT1-012"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.perm("rookie").topCard.cardId).toBe("BT17-010");
    expect(s.perm("rookie").currentDP).toBe(5000);
  });

  it("reads its owner's side of the memory gauge on the opponent's turn (Q2720)", async () => {
    for (const [turnPlayerMemory, bonus] of [
      [2, 2000],
      [0, 2000],
      [-1, 0],
    ] as const) {
      const s = setupEngine({ 0: { battleArea: [{ card: "BT17-013", as: "wargrowlmon", under: ["BT17-010"] }] } });
      s.state.turnSeat = 1;
      s.state.memory = turnPlayerMemory;
      await s.ready();
      await advance(s.engine).recompute();

      expect(s.engine.deletionMaxDp.bonusFor(0, s.perm("wargrowlmon").permanentId)).toBe(bonus);
    }
  });

  it("raises a printed DP deletion maximum by the added amount (Q2721)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-010", as: "growlmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "atRaisedMaximum", dp: 8000 },
            { card: "BT1-011", as: "abovePrintedMaximum", dp: 7000 },
            { card: "BT1-012", as: "aboveRaisedMaximum", dp: 9000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.state.memory).toBe(0);
    expect(s.perm("growlmon").topCard.cardId).toBe("BT17-013");
    const targetPrompt = s.decisions.at(-1)!.req;
    expect(targetPrompt.kind).toBe("chooseTargets");
    expect([...(targetPrompt.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.perm("atRaisedMaximum").permanentId, s.perm("abovePrintedMaximum").permanentId].sort(),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetPrompt.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("atRaisedMaximum").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-011", "BT1-012"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
  });
});
