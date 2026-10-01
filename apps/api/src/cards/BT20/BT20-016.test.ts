import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import "../BT5/BT5-063.js";
import "../BT16/BT16-008.js";
import "../BT16/BT16-068.js";
import "../BT16/BT16-077.js";
import { compiled } from "./BT20-016.js";

describe("BT20-016 Paildramon", () => {
  it("gives one Digimon Piercing and +4000 before optionally attacking on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Piercing" },
            duration: "forTheTurn",
            target: { bindAs: "paildramonBoostTarget" },
          },
          {
            kind: "ModifyDP",
            amount: 4000,
            duration: "forTheTurn",
            target: { fromSelectionRef: "paildramonBoostTarget" },
          },
          { kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true }, optional: true },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Paildramon", "Dinobeemon"], match: "nameExact" }],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: { count: 2 },
              into: {
                kind: ["Digimon"],
                zone: "hand",
                nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "nameExact" }],
              },
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
  });

  it("publishes Paildramon's Free identity, stats, and red/purple level-4 routes", () => {
    expect(getCardDefinition("BT20-016")).toMatchObject({
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      attributes: ["Free"],
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
    });
  });

  it("on play gives one bound ally Piercing and +4000 while allowing the Paildramon attack to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-010", dp: 1000, as: "ally" }],
          hand: [{ card: "BT20-016", as: "paildramon" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paildramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 5000);
    const paildramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-016")!;
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(5000);
    expect(paildramon.isSuspended).toBe(false);
  });

  it("publicly evolves, buffs itself, Pierces in its optional attack, and expires both grants at turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-011", as: "base" }],
          hand: [{ card: "BT20-016", as: "paildramon" }, "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-010", dp: 5000, suspended: true, as: "target" }],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("target").permanentId;
    preferred.push(s.perm("base").permanentId, targetId);
    s.state.memory = 4;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("base").topCard.cardId).toBe("BT20-016");
    expect(s.perm("base").currentDP).toBe(14000);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("base").currentDP).toBe(10000);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(false);
  });

  it("provides inherited Security Attack +1 from a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-020", as: "host", under: ["BT20-016"] }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("proves inherited Security Attack +1 with an actual extra security check", async () => {
    for (const under of [true, false] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT20-020", as: "host", ...(under ? { under: ["BT20-016"] } : {}) }],
          security: ["BT1-010"],
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
      });
      s.state.turnSeat = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "securityChecked").length >= (under ? 2 : 1));
      expect(s.state.players[1]!.security).toHaveLength(under ? 1 : 2);
    }
  });

  it("replaces Paildramon's deletion by DNA digivolving it and Dinobeemon into Dragon Mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const paildramonId = s.perm("paildramon").permanentId;
    const dinobeemonId = s.perm("dinobeemon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([paildramonId], "byEffect")).toBe(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"));

    const dragonMode = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076")!;
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === paildramonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dinobeemonId)).toBe(false);
    expect(dragonMode.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-016", "BT20-074"]));
  });

  it("publicly replaces a battle deletion with DNA and consumes exactly the two field materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon", under: ["BT20-010", "BT20-011"] },
            { card: "BT20-074", as: "dinobeemon", under: ["BT20-072"] },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-012", dp: 10000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    const paildramonId = s.perm("paildramon").permanentId;
    const dinobeemonId = s.perm("dinobeemon").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: paildramonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"));
    const dragonMode = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076")!;
    expect(dragonMode.permanentId).not.toBe(paildramonId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === paildramonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dinobeemonId)).toBe(false);
    expect(dragonMode.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-016", "BT20-074"]));
    expect(s.state.memory).toBe(4);
  });

  it("lets the owner refuse the replacement when legal materials exist, so the battled Paildramon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
        },
        1: { battleArea: [{ card: "BT20-012", dp: 10000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("paildramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-016"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-016")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dragonMode").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-074")).toBe(true);
  });

  it("does not replace the battle deletion when the hand result is a wrong name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-045", as: "wrongResult" }],
        },
        1: { battleArea: [{ card: "BT20-012", dp: 10000, as: "attacker" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("paildramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-016"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-016")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongResult").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-074")).toBe(true);
  });
});

describe("BT20-016 Paildramon — KB Q&A rulings", () => {
  const OPPONENT_SECURITY = ["BT1-009", "BT1-009", "BT1-009"];

  function attackDeclarations(s: EngineSetup) {
    return s.events.filter((event) => event.kind === "attackDeclared" && event.redirected !== true);
  }

  function isPaildramonAttackPrompt({ req }: EngineSetup["decisions"][number]) {
    return req.sourceCardId === "BT20-016" && req.kind === "optional" && (req.promptText ?? "").includes("Attack");
  }

  it("lets the Piercing and +4000 DP go to another Digimon and then skip Paildramon's attack (Q4297)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-011", as: "base" },
            { card: "BT20-010", dp: 1000, as: "ally" },
          ],
          hand: [{ card: "BT20-016", as: "paildramon" }],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds, declinePrompts: ["Attack"] },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(isPaildramonAttackPrompt));
    await settle();

    expect(s.perm("base").topCard.cardId).toBe("BT20-016");
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(s.perm("ally").currentDP).toBe(5000);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(false);
    expect(attackDeclarations(s)).toEqual([]);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(OPPONENT_SECURITY.length);
  });

  it("cannot declare its own attack while Dinobeemon's effect attack is in progress (Q4298)", async () => {
    // A Paildramon host with BT5-063 inherited gives every other [Paildramon] <Rush>, so the
    // played Paildramon is not summoning sick. Only the attack already in progress stops it.
    const rushHost = { card: "BT20-016", as: "rushHost", under: ["BT5-063"] };
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-068", as: "purpleMaterial" }, { card: "BT16-008", as: "redMaterial" }, rushHost],
          hand: [{ card: "BT16-077", as: "dinobeemon" }],
          trash: [{ card: "BT20-016", as: "paildramon" }],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("dinobeemon").instanceId);
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purpleMaterial").permanentId, s.perm("redMaterial").permanentId],
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < OPPONENT_SECURITY.length);
    await settle();

    const dinobeemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT16-077")!;
    const paildramon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("paildramon").instanceId,
    )!;
    expect(observe(s.engine).hasKeyword(paildramon, "Rush")).toBe(true);
    expect(s.decisions.some(isPaildramonAttackPrompt)).toBe(true);
    const paildramonOnPlayIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceInstanceId === s.inst("paildramon").instanceId,
    );
    expect(paildramonOnPlayIndex).toBeGreaterThan(s.events.findIndex((event) => event.kind === "attackDeclared"));
    expect(paildramonOnPlayIndex).toBeLessThan(s.events.findIndex((event) => event.kind === "securityChecked"));
    expect(attackDeclarations(s)).toMatchObject([{ attackerPermanentId: dinobeemon.permanentId }]);
    expect(paildramon.isSuspended).toBe(false);

    // Control: outside an attack, the same Rush lets a played Paildramon attack with its [On Play].
    const control = setupEngine(
      {
        0: { battleArea: [rushHost], hand: [{ card: "BT20-016", as: "paildramon" }] },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await control.ready();
    control.state.memory = 8;
    expect(
      control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("paildramon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => control.state.players[1]!.security.length < OPPONENT_SECURITY.length);
    await settle();
    expect(attackDeclarations(control)).toMatchObject([{ attackerCardId: "BT20-016", target: { kind: "player" } }]);
  });

  it("keeps the DNA-digivolved Dragon Mode on the field instead of deleting it with the replaced Paildramon (Q4299)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon" },
            { card: "BT20-074", as: "dinobeemon" },
          ],
          hand: [{ card: "BT20-076", as: "dragonMode" }],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT20-012", dp: 10000, as: "attacker" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const paildramonId = s.perm("paildramon").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: paildramonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-076"));
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    const dragonMode = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-076");
    expect(dragonMode?.permanentId).not.toBe(paildramonId);
    expect(dragonMode?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-016", "BT20-074"]));
    expect(s.state.players[0]!.trash.some((card) => ["BT20-016", "BT20-074", "BT20-076"].includes(card.cardId))).toBe(
      false,
    );
  });
});
