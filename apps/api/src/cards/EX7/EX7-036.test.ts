import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-036.js";
import "../index.js";

describe("EX7-036 Zephagamon", () => {
  it("matches the catalog, complete IR, and exclusive compiled registration", () => {
    expect(getCardDefinition("EX7-036")).toMatchObject({
      cardId: "EX7-036",
      nameEn: "Zephagamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Magic Knight", "Vortex Warriors", "LIBERATOR", "Bird Dragon"],
      effectText:
        "＜Security Attack +1＞.\n＜Vortex＞ (At the end of your turn, this Digimon may attack an opponent's Digimon. With this effect, it can attack the turn it was played)\n[When Digivolving] [When Attacking] Suspend 1 Digimon. If this effect suspended your Digimon, return 1 of your opponent's suspended Digimon to the bottom of the deck.\n[Rule] Trait: Has the [Bird Dragon] type.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "Static",
          actions: [],
          keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
        },
        { trigger: "Static", actions: [], keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }] },
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Suspend", target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 } },
            {
              kind: "Return",
              target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
              to: "deckBottom",
              condition: { kind: "lastSuspendedIsMine", raw: "this effect suspended your Digimon" },
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          actions: [
            { kind: "Suspend", target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 } },
            {
              kind: "Return",
              target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
              to: "deckBottom",
              condition: { kind: "lastSuspendedIsMine", raw: "this effect suspended your Digimon" },
            },
          ],
        },
        {
          trigger: "Rule",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "trait",
              tokens: ["Bird Dragon"],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(hasRegisteredCompiledCard("EX7-036")).toBe(true);
  });

  it("publicly evolves for 4, draws exactly, suspends its ally, and bottom-decks the exact opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-035", as: "base" },
            { card: "EX7-031", as: "ally" },
          ],
          hand: [{ card: "EX7-036", as: "zepha" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [{ card: "EX7-014", as: "target", suspended: true }],
          deck: [{ card: "BT1-011", as: "existingBottom" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("target").permanentId);
    s.state.memory = 6;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const zephaId = s.inst("zepha").instanceId;
    const targetId = s.inst("target").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const existingBottomId = s.inst("existingBottom").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: zephaId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").isSuspended && !s.state.players[1]!.battleArea.length);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(zephaId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([existingBottomId, targetId]);
  });

  it("suspends an opposing Digimon without bottom-decking when no own Digimon was suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-035", as: "base" }],
          hand: [{ card: "EX7-036", as: "zepha" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX7-014", as: "target" }], deck: ["BT1-011"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zepha").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("does not bottom-deck when the selected own Digimon was already suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-035", as: "base" },
            { card: "EX7-031", as: "ally", suspended: true },
          ],
          hand: [{ card: "EX7-036", as: "zepha" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX7-014", as: "target", suspended: true }], deck: ["BT1-011"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("target").permanentId);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zepha").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-036");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("uses Vortex at end of turn to attack an unsuspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-036", as: "zepha" }], hand: ["BT1-009"], deck: ["BT1-011"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }], deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
  });

  it("performs two Security checks through Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-036", as: "zepha", dp: 12000 }], security: ["BT1-009"] },
        1: { security: ["BT1-009", "BT1-011", "BT1-012"], deck: ["BT1-013"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zepha").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("exposes Bird Dragon as an effective rule trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-036", as: "zepha" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("zepha"), "Bird Dragon")).toBe(true);
  });

  it("rejects evolution from a non-green level 5 without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-042", as: "base" }],
        hand: [{ card: "EX7-036", as: "zepha" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zepha").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("BT1-042");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
