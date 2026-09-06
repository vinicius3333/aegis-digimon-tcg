import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-042.js";
import "./index.js";

describe("BT20-042 Groundramon", () => {
  it("suspends and prevents unsuspending one opponent Digimon or Tamer on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          },
        ],
      });
    }
  });

  it("is an Examon DNA-digivolution alias only in the battle area", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true, zone: "battleArea" }, isSelf: true },
          grant: "name",
          tokens: ["Breakdramon"],
        },
        {
          kind: "GrantStatic",
          grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
        },
      ],
    });
  });

  it("trashes the opponent's top security when this battle-area Digimon deletes in battle", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("suspends and locks an opposing Digimon, and grants only the field Breakdramon alias", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-042", as: "groundramon" }] },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("groundramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended && observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(observe(s.engine).grantedNames(s.perm("groundramon"))).toContain("breakdramon");
    expect(observe(s.engine).grantedNames(s.perm("groundramon"))).not.toContain("examon");
  });

  it("publicly evolves from Coredramon, refuses another level-4 source, and can choose separate Digimon/Tamer targets", async () => {
    const evolved = setupEngine({
      0: { battleArea: [{ card: "BT20-040", as: "coredramon" }], hand: [{ card: "BT20-042", as: "groundramon" }] },
    });
    evolved.state.memory = 3;
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("coredramon").permanentId,
        instanceId: evolved.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => evolved.perm("coredramon").topCard.cardId === "BT20-042" && evolved.state.pendingDecision === undefined,
    );
    expect(evolved.perm("coredramon").stack.map((card) => card.cardId)).toEqual(["BT20-040"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-041", as: "crowmon" }], hand: [{ card: "BT20-042", as: "groundramon" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("crowmon").permanentId,
        instanceId: invalid.inst("groundramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.perm("crowmon").topCard.cardId).toBe("BT20-041");

    const preferred: string[] = [];
    const targets = setupEngine(
      {
        0: { hand: [{ card: "BT20-042", as: "groundramon" }] },
        1: {
          battleArea: [
            { card: "BT20-010", as: "suspendTarget" },
            { card: "BT20-085", as: "restrictTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(targets.perm("suspendTarget").permanentId, targets.perm("restrictTarget").permanentId);
    targets.state.memory = 10;
    await targets.ready();
    expect(
      targets.engine.applyIntent(0, { type: "playCard", instanceId: targets.inst("groundramon").instanceId }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        targets.perm("suspendTarget").isSuspended &&
        observe(targets.engine).isRestricted(targets.perm("restrictTarget"), "unsuspend"),
    );
    expect(targets.perm("restrictTarget").isSuspended).toBe(false);
  });

  it("inherits one opposing top-security trash after its surviving host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-044", dp: 12000, under: ["BT20-042"], as: "host" }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "target" }],
        security: ["BT20-001", "BT20-002"],
      },
    });
    s.state.memory = 5;
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});
