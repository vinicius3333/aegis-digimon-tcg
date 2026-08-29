import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_073 } from "./BT24-073.js";
import "../index.js";

describe("BT24-073 SkullSatamon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-073")).toMatchObject({
      cardId: "BT24-073",
      nameEn: "SkullSatamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "Fallen Angel"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
  });

  it("makes the inherited Security Attack bonus an alternative to milling", () => {
    const inherited = BT24_073.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      condition: { kind: "not", condition: { kind: "zoneCount", zone: "trash", op: "lte", value: 10 } },
    });
    expect(inherited?.actions?.[1]).toMatchObject({
      kind: "TrashTopDeck",
      controller: "both",
      amount: 2,
    });
  });

  it.each([EffectTiming.WhenDigivolving, EffectTiming.OnDeletion])(
    "mills both decks and then revives after reaching 10 opposing trash cards on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-073", as: "skullsatamon" }],
            deck: ["BT1-001", "BT1-002", "BT1-003"],
            trash: [{ card: "BT1-069", as: "revive" }],
          },
          1: {
            deck: ["BT1-004", "BT1-005", "BT1-006"],
            trash: Array.from({ length: 8 }, () => "BT1-007"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("skullsatamon"));
      await settle(() =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId,
        ),
      );

      expect(s.state.players[0]!.deck).toHaveLength(0);
      expect(s.state.players[1]!.deck).toHaveLength(0);
      expect(s.state.players[1]!.trash).toHaveLength(11);
    },
  );

  it("public evolution pays 3, mills both decks, and revives after crossing 10 opposing trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-070", as: "base" }],
          hand: [{ card: "BT24-073", as: "skullsatamon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
          trash: [{ card: "BT1-069", as: "revive" }],
        },
        1: {
          deck: ["BT1-004", "BT1-005", "BT1-006"],
          trash: Array.from({ length: 8 }, () => "BT1-007"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullsatamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId),
    );

    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(11);
  });

  it("public deletion mills both decks and revives an eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-073", as: "skullsatamon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
          trash: [{ card: "BT1-069", as: "revive" }],
        },
        1: {
          deck: ["BT1-004", "BT1-005", "BT1-006"],
          trash: Array.from({ length: 8 }, () => "BT1-007"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("skullsatamon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId),
    );

    expect(s.state.players[1]!.trash).toHaveLength(11);
  });

  it("inherited attack mills both decks instead of security at 10 opposing trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-074", as: "host", under: ["BT24-073"] }],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
        security: ["BT1-004", "BT1-005", "BT1-006"],
      },
      1: {
        deck: ["BT1-007", "BT1-008", "BT1-009"],
        security: ["BT1-010", "BT1-011", "BT1-012"],
        trash: Array.from({ length: 10 }, () => "BT1-013"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("inherited attack grants Security Attack +1 instead of milling above 10 opposing trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-074", as: "host", under: ["BT24-073"] }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: {
        deck: ["BT1-003", "BT1-004"],
        security: ["BT1-006", "BT1-007", "BT1-008"],
        trash: Array.from({ length: 11 }, () => "BT1-005"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
