import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-010.js";

describe("BT11-010 Grizzlymon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-010")).toMatchObject({
      cardId: "BT11-010",
      nameEn: "Grizzlymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      effectText:
        "＜Raid＞ (When this Digimon attacks, you may switch the target of attack to 1 of your opponent's unsuspended Digimon with the highest DP.)",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When this Digimon's attack target is switched, this Digimon gets +3000 DP for the turn.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenAttackTargetSwitched" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("has Raid while it is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-010", as: "grizzly" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("grizzly"), "Raid")).toBe(true);
  });

  it("evolves from a red level 3 for exactly 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "base" }], hand: [{ card: "BT11-010", as: "grizzly" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grizzly").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-010");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack[0]?.cardId).toBe("BT1-010");
  });

  it("uses Raid to redirect onto the highest-DP unsuspended opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-010", as: "grizzly", dp: 10_000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 6000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highId = s.perm("high").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grizzly").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === highId));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("low").permanentId);
  });

  it("gains +3000 before battle when Blocker switches its host's target (Q2055)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-010"], dp: 2000 }] },
      1: { battleArea: [{ card: "ST18-07", as: "blocker", dp: 4000 }], security: ["BT1-009"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("gives its host +3000 DP when that host's attack target is switched", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-010"] }] },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before + 3000);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").currentDP).toBe(before + 3000);
  });

  it("does not boost its host for another Digimon's target switch", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT11-010"] },
          { card: "BT1-064", as: "other" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });
});
