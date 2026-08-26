import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-014.js";

describe("BT11-014 GrapLeomon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-014")).toMatchObject({
      cardId: "BT11-014",
      nameEn: "GrapLeomon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      effectText:
        "＜Raid＞ (When this Digimon attacks, you may switch the target of attack to 1 of your opponent's unsuspended Digimon with the highest DP.)",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When this Digimon's attack target is switched, trash the top card of your opponent's security stack.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Raid" }] },
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
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-014", as: "grap" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("grap"), "Raid")).toBe(true);
  });

  it("evolves from a red level 4 for exactly 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-010", as: "base" }], hand: [{ card: "BT11-014", as: "grap" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("grap").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-014");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack[0]?.cardId).toBe("BT11-010");
  });

  it("uses Raid to redirect onto the highest-DP unsuspended opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-014", as: "grap", dp: 12_000 }] },
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
        attackerPermanentId: s.perm("grap").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === highId));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("trashes security when Blocker switches its host's attack target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-014"], dp: 10_000 }] },
      1: {
        battleArea: [{ card: "ST18-07", as: "blocker", dp: 4000 }],
        security: [
          { card: "BT1-009", as: "topSecurity" },
          { card: "BT1-010", as: "bottomSecurity" },
        ],
      },
    });
    const topId = s.inst("topSecurity").instanceId;
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
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === topId));

    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
  });

  it("trashes one opposing security card when its host's attack target is switched", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-014"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trash security for another Digimon's target switch", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT11-014"] },
          { card: "BT1-064", as: "other" },
        ],
      },
      1: { security: ["BT1-009", "BT1-010"] },
    });

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("does not trigger on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-014"] }] },
      1: { security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
