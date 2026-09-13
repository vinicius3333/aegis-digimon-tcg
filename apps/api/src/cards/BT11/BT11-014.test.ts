import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-014.js";
import "./BT11-017.js";

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

  it("trashes security once on the first public Raid switch, then again next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-017", as: "marsmon", under: ["BT1-009", "BT1-016", "BT11-014"] },
            { card: "BT1-013", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "victim6000", dp: 6000 },
            { card: "BT1-013", as: "victim5000", dp: 5000 },
            { card: "BT1-013", as: "victim4000", dp: 4000 },
          ],
          security: [
            { card: "BT1-009", as: "security0" },
            { card: "BT1-010", as: "security1" },
            { card: "BT1-013", as: "security2" },
          ],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const marsmonId = s.perm("marsmon").permanentId;
    const victimIds = [
      s.perm("victim6000").permanentId,
      s.perm("victim5000").permanentId,
      s.perm("victim4000").permanentId,
    ];
    const securityIds = [
      s.inst("security0").instanceId,
      s.inst("security1").instanceId,
      s.inst("security2").instanceId,
    ];
    expect(s.perm("marsmon").topCard.cardId).toBe("BT11-017");
    expect(s.perm("marsmon").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-016", "BT11-014"]);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    for (const [index, victimId] of victimIds.slice(0, 2).entries()) {
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: marsmonId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victimId));
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.memory).toBe(3);
      expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
        securityIds[1],
        securityIds[2],
      ]);
      expect(s.perm("marsmon").isSuspended).toBe(index === 1);
    }
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityIds[0]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(securityIds[1]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: marsmonId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victimIds[2]));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(3);
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([securityIds[2]]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(securityIds[1]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(securityIds[2]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
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
