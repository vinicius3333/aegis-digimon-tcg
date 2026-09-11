import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-052.js";

const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

describe("BT23-052 Consulmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-052")).toMatchObject({
      cardId: "BT23-052",
      nameEn: "Consulmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Life"],
      types: ["Saving"],
      linkDp: 3000,
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 2",
    });
    expect(compiled.linkRequirement).toEqual([{ cost: 2, traits: ["Appmon"] }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("compiles the Security, On Play, When Digivolving and Link clauses", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "untilOpponentTurnEnd" },
            { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
          ],
        },
      ],
    });
  });

  it("survives its security battle, plays itself for free after it, and then restricts the attacker's board", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 3000 },
            { card: "BT1-010", as: "bystander" },
          ],
        },
        1: { security: [{ card: "BT23-052", as: "securityConsul" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("bystander").topCard.instanceId);
    const consulId = s.inst("securityConsul").instanceId;
    const attackerCardId = s.perm("attacker").topCard.instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === consulId) &&
        observe(s.engine).isRestricted(s.perm("bystander"), "attackPlayers"),
    );
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === consulId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([consulId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === attackerCardId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore);
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "attackPlayers")).toBe(true);
    const battleIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    const movedIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(consulId),
    );
    expect(battleIndex).toBeGreaterThanOrEqual(0);
    expect(movedIndex).toBeGreaterThan(battleIndex);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("plays itself from the trash even when the security battle deletes it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 7000 }] },
        1: { security: [{ card: "BT23-052", as: "securityConsul" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const consulId = s.inst("securityConsul").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === consulId));
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    const battle = s.events.find((event) => event.kind === "securityChecked");
    expect(battle && "battle" in battle ? battle.battle : undefined).toMatchObject({
      attackerDeleted: false,
      securityDigimonDeleted: true,
    });
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([consulId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === consulId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
  });

  it("restricts exactly one opposing Digimon on a public play and pays the printed 4 memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-052", as: "consul" }],
          battleArea: [{ card: "BT1-009", as: "own" }],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "chosen" },
            { card: "BT1-010", as: "spared" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 6;
    await s.ready();
    preferred.push(s.perm("chosen").topCard.instanceId);
    const consulId = s.inst("consul").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: consulId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === consulId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("spared"), "attackPlayers")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("own"), "attackPlayers")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("blocks the restricted Digimon's player attack, allows its Digimon attack, and expires at the turn boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-052", as: "consul" },
            { card: "ST1-02", as: "spare" },
          ],
          security: SECURITY,
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "chosen" },
            { card: "BT1-010", as: "spared" },
          ],
          security: SECURITY,
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 6;
    await s.ready();
    preferred.push(s.perm("chosen").topCard.instanceId);
    const chosenId = s.perm("chosen").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("consul").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers"));
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers")).toBe(true);
    const prey = s.putOnBoard(0, { card: "BT1-011", as: "prey", suspended: true });
    await s.ready();

    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: chosenId, target: { kind: "player" } }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.perm("chosen").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: chosenId,
        target: { kind: "permanent", permanentId: prey.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === chosenId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === prey.permanentId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("spared"), "attackPlayers")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves a breeding-area Digimon alone when the opponent controls nothing else", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-052", as: "consul" }] },
        1: { breeding: { card: "BT2-052", as: "hatched" } },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const consulId = s.inst("consul").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: consulId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === consulId));

    expect(observe(s.engine).isRestricted(s.perm("hatched"), "attackPlayers")).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a Black Level 3 for 2 memory, draws 1, and restricts an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-052", as: "base" }],
          hand: [{ card: "BT23-052", as: "consul" }],
          deck: ["BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "chosen" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const baseCardId = s.perm("base").topCard.instanceId;
    const consulId = s.inst("consul").instanceId;
    const drawnId = s.state.players[0]!.deck[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: consulId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT23-052");
    expect(s.perm("base").topCard.instanceId).toBe(consulId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseCardId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attackPlayers")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an off-color and an off-level digivolution source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "redLevel3" },
            { card: "BT2-057", as: "blackLevel4" },
          ],
          hand: [
            { card: "BT23-052", as: "consulA" },
            { card: "BT23-052", as: "consulB" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redLevel3").permanentId,
        instanceId: s.inst("consulA").instanceId,
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackLevel4").permanentId,
        instanceId: s.inst("consulB").instanceId,
      }).ok,
    ).toBe(false);

    expect(s.perm("redLevel3").topCard.cardId).toBe("BT1-009");
    expect(s.perm("blackLevel4").topCard.cardId).toBe("BT2-057");
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.memory).toBe(10);
  });

  it("links to an Appmon for cost 2, adds 3000 DP, and grants Reboot and Blocker to the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT23-052", as: "consul" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseDp = s.perm("host").currentDP;
    const consulId = s.inst("consul").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: consulId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === consulId) &&
        observe(s.engine).hasKeyword(s.perm("host"), "Reboot") &&
        observe(s.engine).hasKeyword(s.perm("host"), "Blocker"),
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([consulId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses to link onto a host without the [Appmon] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-052", as: "nonAppmon" }],
        hand: [{ card: "BT23-052", as: "consul" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseDp = s.perm("nonAppmon").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("consul").instanceId,
        targetPermanentId: s.perm("nonAppmon").permanentId,
      }).ok,
    ).toBe(false);

    expect(s.perm("nonAppmon").linked).toHaveLength(0);
    expect(s.perm("nonAppmon").currentDP).toBe(baseDp);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT23-052"]);
    expect(observe(s.engine).hasKeyword(s.perm("nonAppmon"), "Reboot")).toBe(false);
  });

  it("keeps the linked Reboot and Blocker through the opponent's turn and drops them at its end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [
          { card: "BT23-052", as: "consul" },
          { card: "ST1-02", as: "spare" },
        ],
        security: SECURITY,
        deck: ["BT1-012", "BT1-013", "BT1-014"],
      },
      1: { security: SECURITY, deck: ["BT1-012", "BT1-013", "BT1-014"] },
    });
    s.state.memory = 5;
    await s.ready();
    const consulId = s.inst("consul").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: consulId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    // "until your opponent's turn ends": both keywords survive the whole opponent turn.
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([consulId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
