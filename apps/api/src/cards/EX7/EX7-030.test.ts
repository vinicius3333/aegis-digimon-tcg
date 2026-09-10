import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-030.js";
import "../index.js";
import "../ST19/ST19-12.js";

describe("EX7-030 Cendrillmon", () => {
  it("matches the catalog, errata, Q3847 primitives, complete IR, and exclusive registration", () => {
    expect(getCardDefinition("EX7-030")).toMatchObject({
      cardId: "EX7-030",
      nameEn: "Cendrillmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Puppet", "LIBERATOR"],
      effectText:
        "＜Overclock ([Puppet] trait)＞(At the end of your turn, by deleting 1 of your Tokens or other [Puppet] trait Digimon, this Digimon attacks a player without suspending)\n[Start of Your Main Phase] [When Digivolving] You may play 1 [Familiar] Token (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn)\n[When Attacking] 1 of your opponent's Digimon gets -6000 DP for the turn.",
    });
    expect(getCardDefinition("TOKEN-Familiar-Token")).toMatchObject({
      colors: ["Yellow"],
      kinds: ["Digimon"],
      dp: 3000,
      isToken: true,
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "Static",
          actions: [],
          keywords: [{ keyword: "Overclock", traitFilter: ["Puppet"], raw: "＜Overclock ([Puppet] trait)＞" }],
        },
        {
          trigger: "EndOfYourTurn",
          actions: [
            {
              kind: "Attack",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              attackPlayer: true,
              withoutSuspending: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
                    allowTokens: true,
                  },
                  count: 1,
                },
                raw: "by deleting 1 of your Tokens or other [Puppet] trait Digimon",
              },
            },
          ],
          keywords: [{ keyword: "Overclock", traitFilter: ["Puppet"], raw: "＜Overclock ([Puppet] trait)＞" }],
        },
        {
          trigger: "StartOfYourMainPhase",
          actions: [{ kind: "PlayToken", tokens: ["Familiar"], count: 1, payCost: false, optional: true }],
        },
        {
          trigger: "WhenDigivolving",
          actions: [{ kind: "PlayToken", tokens: ["Familiar"], count: 1, payCost: false, optional: true }],
        },
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -6000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(hasRegisteredCompiledCard("EX7-030")).toBe(true);
  });

  it.each([
    ["accepts", true],
    ["declines", false],
  ] as const)("%s the optional Familiar at the real start of Main", async (_label, accepts) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-030", as: "cendrill" }], hand: ["BT1-009"], deck: ["BT1-011"] },
        1: { deck: ["BT1-012"] },
      },
      accepts ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "TOKEN-Familiar-Token")).toHaveLength(
      accepts ? 1 : 0,
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });

  it("publicly evolves for 4, draws exactly, preserves the stack, and plays a Familiar", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-028", as: "base" }],
          hand: [{ card: "EX7-030", as: "cendrill" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const cendrillId = s.inst("cendrill").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: cendrillId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Familiar-Token"));
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(cendrillId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
  });

  it("applies -6000 DP through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-030", as: "cendrill" }], deck: ["BT1-009"], security: ["BT1-011"] },
        1: { battleArea: [{ card: "EX7-014", as: "target", dp: 12000 }], deck: ["BT1-012"], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cendrill").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("Q3847: Overclock combines Cendrillmon and Familiar's simultaneous DP triggers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-030", as: "cendrill" },
            { card: "TOKEN-Familiar-Token", as: "familiar" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-011"],
        },
        1: {
          battleArea: [{ card: "EX7-014", as: "target", dp: 12000 }],
          deck: ["BT1-012"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      {
        autoDeclineOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
      },
    );
    const sourceId = s.perm("cendrill").permanentId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    await turn;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Familiar-Token")).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === sourceId)).toBe(
      true,
    );
    expect(s.perm("cendrill").isSuspended).toBe(false);
  });

  it("rejects evolution from a non-yellow level 5 without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-042", as: "base" }],
        hand: [{ card: "EX7-030", as: "cendrill" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cendrill").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("BT1-042");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
