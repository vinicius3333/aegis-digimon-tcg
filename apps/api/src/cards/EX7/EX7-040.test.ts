import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-040.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-040 ToyAgumon", () => {
  it("matches the catalog, complete IR, alternate route, and exclusive registration", () => {
    expect(getCardDefinition("EX7-040")).toMatchObject({
      cardId: "EX7-040",
      nameEn: "ToyAgumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Puppet"],
      effectText:
        "[Digivolve]Lv.2 w/[Three Musketeers]\u00a0in its text: Cost 0 \n\n[On Play] By trashing 1 card with the [Three Musketeers]\u00a0trait in your hand, ＜Draw 2＞.",
      inheritedEffectText: "＜Reboot＞.",
    });
    expect(digivolutionRequirementsFor("EX7-040")).toContainEqual({
      level: 2,
      texts: ["Three Musketeers"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 2,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
                  },
                  count: 1,
                },
                raw: "By trashing 1 card with the [Three Musketeers] trait in your hand",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
        {
          trigger: "Static",
          actions: [],
          isInherited: true,
          keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 2, texts: ["Three Musketeers"], cost: 0, isAlternate: true }],
    });
    expect(hasRegisteredCompiledCard("EX7-040")).toBe(true);
  });

  it("publicly pays the Three Musketeers hand cost and draws exactly 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-040", as: "toy" },
            { card: "BT6-112", as: "cost" },
          ],
          deck: [
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("toy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("second").instanceId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
  });

  it("declines without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-040", as: "toy" },
            { card: "BT6-112", as: "cost" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("toy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("asks nothing and draws nothing without an eligible cost card", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX7-040", as: "toy" },
          { card: "BT1-009", as: "ineligible" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("toy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-040"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("ineligible").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(0);
  });

  it("alternate-evolves from a level 2 whose text names Three Musketeers for 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX7-005", as: "egg" },
        hand: [{ card: "EX7-040", as: "toy" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const eggId = s.inst("egg").instanceId;
    const toyId = s.inst("toy").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: toyId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === toyId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects a level 2 without Three Musketeers text on the alternate route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "P-148", as: "egg" },
        hand: [{ card: "EX7-040", as: "toy" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("toy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.cardId).toBe("P-148");
    expect(s.perm("egg").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("passes inherited Reboot through public evolution and unsuspends on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-040", as: "base" }],
          hand: [{ card: "EX7-041", as: "host" }, "BT1-009"],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-011"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const baseId = s.inst("base").instanceId;
    const hostId = s.inst("host").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: hostId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === hostId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("base").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("base").isSuspended).toBe(false);
    await stopLoop(s, loop, 1);
  });
});
