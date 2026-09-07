import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-042.js";
import "./BT20-043.js";
import "./BT20-045.js";
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
    expect(s.state.memory).toBe(3);
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
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => evolved.perm("coredramon").topCard.cardId === "BT20-042" && evolved.state.pendingDecision === undefined,
    );
    expect(evolved.state.memory).toBe(0);
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

  it("offers Examon Blast DNA when Groundramon is the field Breakdramon alias", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-042", as: "groundramon" }],
          hand: [
            { card: "BT20-027", as: "slayerdramon" },
            { card: "BT20-045", as: "examon" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-009", as: "attacker" }],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("examon").instanceId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-045"),
    );
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-045");
    expect(result).toBeDefined();
    expect(result!.stack.map((card) => card.cardId)).toEqual(["BT20-027", "BT20-042"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT20-042")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT20-027")).toBe(false);
    expect(s.state.memory).toBe(3);
  });

  it("does not offer Blast DNA when Groundramon is only in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-027", as: "slayerdramon" }],
          hand: [
            { card: "BT20-042", as: "handGroundramon" },
            { card: "BT20-045", as: "examon" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-009", as: "attacker" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-042", "BT20-045"]);
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

  it("does not trash security when its host and the opponent leave simultaneously", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-043", dp: 12000, as: "host", under: ["BT20-042"] }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 12000, suspended: true, as: "opponent" }],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-010", "BT1-010"],
      },
    });
    const hostId = s.perm("host").permanentId;
    const opponentId = s.perm("opponent").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
