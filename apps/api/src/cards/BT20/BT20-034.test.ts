import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-034.js";
import "./index.js";

describe("BT20-034 Boutmon", () => {
  it("has Fortitude, restricts one opponent Digimon after a Tamer enters the stack, and trashes security on inherited battle deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    const main = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(main).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            {
              kind: "Restrict",
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
    ]);
  });

  it("has Fortitude and restricts an opponent after a Tamer enters its source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("boutmon"), "Fortitude")).toBe(true);
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    const unrelatedHost = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-034", as: "boutmon" },
            { card: "BT20-030", as: "otherHost" },
          ],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await unrelatedHost.ready();
    await advance(unrelatedHost.engine).verb.placeUnder(unrelatedHost.perm("otherHost").permanentId, [
      unrelatedHost.inst("tamer").instanceId,
    ]);
    expect(
      observe(unrelatedHost.engine).isRestricted(unrelatedHost.perm("target"), "cannotActivateWhenDigivolving"),
    ).toBe(false);
  });

  it("publicly evolves from a level-4 Digimon with Pulsemon in its text and rejects a level-3 source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-032", as: "bulkmon" }], hand: [{ card: "BT20-034", as: "boutmon" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("bulkmon").permanentId,
        instanceId: legal.inst("boutmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => legal.perm("bulkmon").topCard.cardId === "BT20-034" && legal.state.pendingDecision === undefined,
    );
    expect(legal.perm("bulkmon").stack.map((card) => card.cardId)).toEqual(["BT20-032"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT20-029", as: "pulsemon" }], hand: [{ card: "BT20-034", as: "boutmon" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("pulsemon").permanentId,
        instanceId: illegal.inst("boutmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("pulsemon").topCard.cardId).toBe("BT20-029");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-034");
  });

  it("restricts exactly one selected opposing Digimon and expires at the real opponent turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-034", as: "boutmon" }], hand: [{ card: "BT20-085", as: "tamer" }] },
        1: {
          battleArea: [
            { card: "BT20-010", as: "selected" },
            { card: "BT20-010", as: "other" },
          ],
          hand: [{ card: "BT1-070", as: "playable" }],
          deck: ["BT20-001", "BT20-001", "BT20-001", "BT20-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("selected").permanentId);
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("selected"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("other"), "cannotActivateWhenDigivolving")).toBe(false);

    s.state.memory = -4;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("selected"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("suppresses a restricted target's When Digivolving effect on a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: {
          battleArea: [{ card: "BT20-071", as: "target" }],
          hand: [{ card: "BT20-035", as: "evolution" }],
          security: ["BT20-001", "BT20-002", "BT20-003"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT20-035");
    expect(s.perm("boutmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("inherits one opposing top-security trash after its host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-035", as: "host", under: ["BT20-034"] }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }],
        security: ["BT20-001", "BT20-002"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("does not trash security when another allied Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-035", as: "host", under: ["BT20-034"] },
          { card: "BT20-010", as: "otherAttacker" },
        ],
      },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }],
        security: ["BT20-001", "BT20-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});
