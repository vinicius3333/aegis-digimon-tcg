import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-011.js";

describe("BT18-011 Agunimon", () => {
  it("returns a Hybrid Digimon from trash when digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              or: [
                { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] },
                { kind: ["Tamer"], hasInheritedEffects: true },
              ],
            },
          },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "burning" }],
          hand: [{ card: "BT18-011", as: "agunimon" }],
          trash: ["BT12-009"],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burning").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard?.cardId === "BT18-011");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-009")).toBe(true);
  });

  it("returns a Ten Warriors Digimon from trash when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "burning" }],
          hand: [{ card: "BT18-011", as: "agunimon" }],
          trash: [{ card: "BT18-017", as: "tenWarriors" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burning").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard?.cardId === "BT18-011");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tenWarriors").instanceId)).toBe(true);
  });

  it("returns a Tamer with inherited effects but not a plain Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "burning" }],
          hand: [{ card: "BT18-011", as: "agunimon" }],
          trash: [
            { card: "BT18-087", as: "plainTamer" },
            { card: "BT18-088", as: "inheritedTamer" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burning").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard?.cardId === "BT18-011");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("inheritedTamer").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("plainTamer").instanceId);
  });

  it("may decline the trash return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-013", as: "burning" }],
          hand: [{ card: "BT18-011", as: "agunimon" }],
          trash: [{ card: "BT12-009", as: "hybrid" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("burning").permanentId,
        instanceId: s.inst("agunimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("hybrid").instanceId);
  });

  it.each([
    ["Takuya Kanbara", "BT12-088", 3],
    ["BurningGreymon", "BT12-013", 5],
  ])("digivolves from %s with the printed alternate cost", async (_name, baseCard, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-011", as: "agunimon" }],
        deck: [{ card: "BT1-001", as: "draw" }],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("agunimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-011");
    expect(s.state.memory).toBe(expectedMemory);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("grants its host 2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-011"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3000);
  });
});
