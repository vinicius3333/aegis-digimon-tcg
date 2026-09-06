import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-010.js";

describe("BT23-010 GeoGreymon", () => {
  it("matches every catalog field and carries all main and inherited clauses", () => {
    expect(getCardDefinition("BT23-010")).toMatchObject({
      cardId: "BT23-010",
      nameEn: "GeoGreymon",
      colors: ["Red", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dinosaur", "CS"],
      effectText:
        "[Digivolve] Lv.3 w/[Agumon]\u00a0in name or w/[CS]\u00a0trait: Cost 2 \n\n[Security] At the end of the battle, play this card without paying the cost.\n＜Raid＞ \n＜Blocker＞",
      inheritedEffectText: "＜Blocker＞",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "Security",
          timing: "endOfBattle",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSecurityBattleEnded",
              once: true,
              actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
            },
          ],
        },
        { trigger: "Static", keywords: [{ keyword: "Raid" }] },
        { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
        { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
      ],
      digivolutionRequirement: [
        { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
        { level: 3, traits: ["CS"], cost: 2, isAlternate: true },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("plays itself from security after battle without paying memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-057", as: "attacker" }] },
      1: { security: [{ card: "BT23-010", as: "securityGeo" }] },
    });
    s.state.memory = 2;
    const geoId = s.inst("securityGeo").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === geoId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === geoId)).toBe(true);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === geoId)).toBe(false);
  });

  it("supports both off-color alternate evolution recipes and rejects a nonmatch", async () => {
    for (const base of ["BT11-046", "BT22-017"] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-010", as: "geo" }], deck: ["BT1-009"] },
      });
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("geo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("geo").instanceId);
      expect(s.state.memory).toBe(1);
      expect(s.perm("base").stack[0]!.instanceId).toBe(s.inst("base").instanceId);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT23-010", as: "geo" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("geo").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses Raid to redirect a player attack onto an unsuspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-010", as: "geo" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("geo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("has Blocker both as the top card and as an inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-010", as: "topGeo" },
          { card: "BT23-012", under: ["BT23-010"], as: "inheritedHost" },
        ],
        security: 1,
      },
      1: { battleArea: [{ card: "BT23-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("topGeo"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("inheritedHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
