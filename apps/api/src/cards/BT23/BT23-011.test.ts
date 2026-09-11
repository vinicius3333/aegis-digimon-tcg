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
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.perm("csBase").stack[0]!.instanceId).toBe(s.inst("csBase").instanceId);
  });

  it("refuses the alternate route from a Lv.3 source without the CS trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-027", as: "nonCsBase" }],
        hand: [{ card: "BT23-011", as: "birdramon" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "target" }] },
    });
    s.state.memory = 3;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonCsBase").permanentId,
        instanceId: s.inst("birdramon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    await settle();
    expect(s.perm("nonCsBase").topCard!.cardId).toBe("BT1-027");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("birdramon").instanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  /**
   * The inherited [On Deletion] reached through a real battle: seat 1 attacks the suspended
   * host, the host loses the battle and is deleted, and the trigger resolves from the stack.
   * `host` is an effect-free Lv.4 so the only trigger in flight belongs to BT23-011.
   */
  async function battleDeleteHost(tamer: string, opts: { decline?: boolean }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", under: ["BT23-011"], dp: 3000, suspended: true, as: "host" }],
          hand: [{ card: tamer, as: "tamer" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 5000, as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      opts.decline === true
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // The host must be suspended for seat 1 to target it, and seat 0's unsuspend phase has
    // already cleared the board spec's flag — so suspend it the public way, by attacking.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.state.players[1]!.security.length === 0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    return { s, loop };
  }

  it.each([
    ["BT1-085", "red Tamer"],
    ["BT22-085", "off-color CS Tamer"],
  ])("plays a %s (%s) from hand without cost after a battle deletion", async (tamer) => {
    const { s, loop } = await battleDeleteHost(tamer, {});
    const memoryBeforeResolution = s.state.memory;
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("tamer").instanceId);
    expect(s.state.memory).toBe(memoryBeforeResolution);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer an inherited play for a non-red non-CS Tamer", async () => {
    const { s, loop } = await battleDeleteHost("BT1-086", {});
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("allows the inherited Tamer play to be refused without moving the card", async () => {
    const { s, loop } = await battleDeleteHost("BT1-085", { decline: true });
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(
      false,
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
