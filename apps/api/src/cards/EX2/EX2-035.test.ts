import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-035.js";
import "../index.js";
import "./EX2-035.js";
import "./EX2-036.js";
import "./EX2-037.js";
import "./EX2-022.js";
import "./EX2-031.js";
import "./EX2-032.js";
import "../BT19/BT19-095.js";

describe("EX2-035 Cyberdramon", () => {
  it("matches the catalog and compiled play, attack restriction, and inherited de-digivolve", () => {
    expect(getCardDefinition("EX2-035")).toMatchObject({
      cardId: "EX2-035",
      nameEn: "Cyberdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 10000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      effectText:
        "[When Digivolving] You may play 1 [Ryo Akiyama] from your hand without paying its memory cost.[Your Turn] While you have no Tamers in play, this Digimon can't attack players.",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] If you have 2 or more black Tamers in play, ＜De-Digivolve 1＞ 1 of your opponent's Digimon. (Trash 1 card from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards.)",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Aura",
              while: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Tamer"] } },
              effect: { kind: "restriction", restriction: "attackPlayers" },
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              condition: { kind: "youHave", filter: { zone: "battleArea", colors: ["Black"] }, count: 2 },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("plays Ryo Akiyama from hand for free when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-031", as: "base" }],
          hand: [
            { card: "EX2-035", as: "evolution" },
            { card: "EX2-062", as: "ryo" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ryo").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ryo").instanceId),
    ).toBe(true);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-031"]);
    expect(s.perm("base").topCard.cardId).toBe("EX2-035");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("cannot attack the opponent directly while its controller has no Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-035", as: "cyberdramon" }] },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyberdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("still performs a Piercing check after deleting a Digimon with no Tamers (Q3325)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-035", as: "cyberdramon" }],
          hand: [{ card: "BT19-095", as: "device" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 3000 }],
          deck: ["BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("device").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT19-095"));
    expect(observe(s.engine).hasPierce(s.perm("cyberdramon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyberdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not de-digivolve with fewer than two black Tamers", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-036", as: "host", under: ["EX2-035"] }, "EX2-062"] },
        1: { battleArea: [{ card: "EX2-036", as: "target", under: ["EX2-032"] }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("de-digivolves one source through a minimal public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-036", under: ["EX2-035"], as: "host" },
            { card: "EX2-062", as: "ryo" },
            { card: "EX2-063", as: "kazu" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "EX2-036", under: ["BT1-009", "EX2-032"], as: "target" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-014", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").topCard.cardId).toBe("EX2-032");
    await settle(() => !observe(s.engine).isAttacking());
  });

  it("de-digivolves once per turn with two black Tamers and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-022", under: ["EX2-035"], as: "host" },
            { card: "EX2-062", as: "ryo" },
            { card: "EX2-063", as: "kazu" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "EX2-036", under: ["BT1-009", "EX2-032"], as: "target" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").topCard.cardId).toBe("EX2-032");
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => !s.perm("host").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").stack).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
