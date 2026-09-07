import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-011.js";

describe("BT23-011 Birdramon", () => {
  it("matches every catalog field and carries the full executable IR", () => {
    expect(getCardDefinition("BT23-011")).toMatchObject({
      cardId: "BT23-011",
      nameEn: "Birdramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Giant Bird", "CS"],
      effectText:
        "[Digivolve] Lv.3 w/[CS]\u00a0trait: Cost 2 \n\n[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less.",
      inheritedEffectText:
        "[On Deletion] You may play 1 red or [CS]\u00a0trait Tamer card from your hand without paying the cost.",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } },
              count: 1,
            },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              or: [{ colors: ["Red"] }, { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(compiled).toMatchObject({
      digivolutionRequirement: [{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }],
      coverage: "full",
      residual: [],
    });
  });

  it("deletes an opposing 4000-DP Digimon but not a 5000-DP Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-011", as: "birdramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 4000, as: "eligible" },
            { card: "BT1-010", dp: 5000, as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const eligibleId = s.perm("eligible").permanentId;
    const tooLargeId = s.perm("tooLarge").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === tooLargeId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("deletes at the same exact boundary when digivolving through the off-color CS recipe", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-017", as: "csBase" }],
          hand: [{ card: "BT23-011", as: "birdramon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("csBase").permanentId,
        instanceId: s.inst("birdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.perm("csBase").stack[0]!.instanceId).toBe(s.inst("csBase").instanceId);
  });

  it.each([
    ["BT1-085", "red Tamer"],
    ["BT22-085", "off-color CS Tamer"],
  ])("plays a %s (%s) from hand on inherited deletion without cost", async (tamer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-013", under: ["BT23-011"], as: "host" }],
          hand: [{ card: tamer, as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not offer an inherited play for a non-red non-CS Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-013", under: ["BT23-011"], as: "host" }],
          hand: [{ card: "BT1-086", as: "nonmatch" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonmatch").instanceId);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("allows the inherited Tamer play to be refused without moving the card or memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-013", under: ["BT23-011"], as: "host" }],
          hand: [{ card: "BT1-085", as: "redTamer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("redTamer").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("fires the inherited play after a natural battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-012", under: ["BT23-011"], dp: 3000, suspended: true, as: "host" }],
          hand: [{ card: "BT1-085", as: "tamer" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 5000, as: "attacker" }], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });
});
