import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-036.js";
import "../BT1/BT1-070.js";
import "../EX1/EX1-034.js";

describe("EX4-036 BlackRapidmon", () => {
  it("De-Digivolves one opponent Digimon by 1 and nothing more", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions;
    expect(actions).toHaveLength(1);
    expect(actions?.[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent" } },
    });
  });
  it("gains Piercing when an effect suspends another opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { excludeSelf: true },
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }],
        },
      ],
    });
  });
  it("records complete compiled coverage", () => {
    expect(getCardDefinition("EX4-036")).toMatchObject({
      nameEn: "BlackRapidmon",
      colors: ["Green", "Black"],
      level: 5,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-036");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("digivolves from a Gargomon-named level-4 Digimon for the alternate cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-05", as: "gargomon" }],
          hand: [{ card: "EX4-036", as: "blackRapidmon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gargomon").permanentId,
        instanceId: s.inst("blackRapidmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gargomon").topCard.cardId === "EX4-036");
    expect(s.perm("gargomon").topCard.cardId).toBe("EX4-036");
    expect(s.state.memory).toBe(0);
  });

  it("accepts a different green two-color level-4 route and rejects a level-3 route", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "EX4-035", as: "base" }], hand: [{ card: "EX4-036", as: "card" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("card").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "EX4-036");
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "EX4-034", as: "base" }], hand: [{ card: "EX4-036", as: "card" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("card").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX4-036"]);
  });

  it("De-Digivolves exactly the top card of an opponent's Digimon at End of Attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-036", as: "host" }] },
      1: {
        battleArea: [{ card: "BT1-021", as: "target", under: ["BT1-014", "BT1-009"] }],
        security: ["BT1-013"],
      },
    });
    await s.ready();
    const targetPermanentId = s.perm("target").permanentId;
    const opponentTarget = () => s.state.players[1]!.battleArea.find((perm) => perm.permanentId === targetPermanentId)!;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-021"));

    expect(opponentTarget().topCard.cardId).toBe("BT1-009");
    expect(opponentTarget().stack.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain("BT1-014");
  });

  it("gains Piercing during its turn when a public effect suspends another opposing Digimon, as digivolution material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "host", under: ["EX4-036"] }],
          hand: [{ card: "BT1-070", as: "arukenimon" }],
        },
        1: { battleArea: [{ card: "BT1-021", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("arukenimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    await settle(() => observe(s.engine).hasPierce(s.perm("host")));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("re-arms the inherited Piercing watcher on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "host", under: ["EX4-036"] }],
          hand: [
            { card: "BT1-070", as: "firstKuwagamon" },
            { card: "BT1-070", as: "secondKuwagamon" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "firstTarget" },
            { card: "BT1-021", as: "secondTarget" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstKuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("firstTarget").isSuspended && observe(s.engine).hasPierce(s.perm("host")));
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.state.turnSeat).toBe(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondKuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.isSuspended));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain Piercing from an effect that suspends another Digimon during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-021", as: "host", under: ["EX4-036"] },
            { card: "BT1-021", as: "decoy" },
          ],
        },
        1: { hand: [{ card: "BT1-070", as: "arukenimon" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("arukenimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("decoy").isSuspended || s.perm("host").isSuspended);

    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
  });

  ex4CardBehaviorTests("EX4-036");
});

describe("EX4-036 BlackRapidmon — KB Q&A rulings", () => {
  it("De-Digivolves only one of the opponent's Digimon at End of Attack (Q3482)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-036", as: "host" },
            { card: "BT1-070", as: "ownStacked", under: ["BT1-064"] },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "target", under: ["BT1-064"] }],
          security: ["BT1-102"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ownStacked").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-064");

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("ownStacked").topCard.cardId).toBe("BT1-070");
    expect(s.perm("ownStacked").stack.map((card) => card.cardId)).toEqual(["BT1-064"]);
  });

  it("does not check security with Piercing gained after the battle already deleted the target (Q3483)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-070", as: "attacker", dp: 9000, under: ["EX4-036"] },
            { card: "BT1-064", as: "ally", dp: 3000 },
          ],
        },
        1: {
          battleArea: [{ card: "EX1-034", as: "palmon", suspended: true }],
          security: ["BT1-102", "BT1-102"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").topCard.instanceId);
    const palmonPermanentId = s.perm("palmon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: palmonPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("ally").isSuspended);

    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === palmonPermanentId)).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("digivolves for 3 only from a level 4 in either alternate branch (Q3484)", async () => {
    function alternateDigivolve(baseCardId: string) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX4-036", as: "card" }] },
      });
      s.state.memory = 3;
      return s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
        useAlternateCost: true,
      }).ok;
    }

    expect(alternateDigivolve("EX4-035")).toBe(true);
    expect(alternateDigivolve("BT23-041")).toBe(true);
    expect(alternateDigivolve("BT22-043")).toBe(false);
    expect(alternateDigivolve("BT17-049")).toBe(false);
    expect(alternateDigivolve("BT19-054")).toBe(false);
  });
});
