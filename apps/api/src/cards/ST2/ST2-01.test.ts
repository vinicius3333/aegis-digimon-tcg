import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./ST2-01.js";
import "../index.js";

describe("ST2-01 Tsunomon", () => {
  it("matches the inherited battle-window contract", () => {
    const definition = getCardDefinition("ST2-01")!;
    const effect = compiled.effects[0]!;

    expect(definition).toMatchObject({
      nameEn: "Tsunomon",
      kinds: ["DigiEgg"],
      colors: ["Blue"],
      level: 2,
      maxCountInDeck: 4,
      inheritedEffectText:
        "[Your Turn] This Digimon gets +1000 DP when battling an opponent's Digimon that has no digivolution cards.",
    });
    expect(definition.effectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
    expect(effect.trigger).toBe("YourTurn");
    expect(effect.isInherited).toBe(true);
    expect(effect.condition).toEqual({
      kind: "selfBattlesOpponentMatching",
      filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
    });
    expect(effect.actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        amount: 1000,
        duration: "permanent",
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gives its host +1000 DP while battling a source-less opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker", under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "BT1-028", as: "defender", suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // Tsunomon's +1000 DP turns the 3000-DP attacker into a 4000-DP winner;
    // without the inherited bonus, this matchup would be an equal-DP deletion.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not grant the bonus against a Digimon that has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "attacker", under: ["ST2-01"] }] },
      1: { battleArea: [{ card: "BT1-014", as: "defender", suspended: true, under: ["BT1-009"] }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("applies the bonus when its attack is blocked by a source-less Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-09", as: "host", under: ["ST2-01", "BT1-028", "BT1-037"] }] },
      1: { battleArea: [{ card: "BT11-013", as: "blocker" }], security: ["BT1-001"] },
    });
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not grant the inherited battle bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-09", as: "host", suspended: true, under: ["ST2-01", "BT1-028", "BT1-037"] }] },
      1: { battleArea: [{ card: "ST1-09", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  for (const withSource of [false, true]) {
    it(`applies the inherited condition in a public Marsmon battle against ${withSource ? "one source" : "no sources"}`, async () => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-028", as: "host", under: [{ card: "ST2-01", as: "tsunomon" }] }],
            hand: [{ card: "BT25-020", as: "marsmon" }],
            deck: ["BT1-028", "BT1-028"],
            security: ["BT1-028"],
          },
          1: {
            battleArea: [
              { card: "BT1-037", as: "victim", under: withSource ? [{ card: "BT1-028", as: "victimSource" }] : [] },
              { card: "BT12-112", as: "discount" },
            ],
            deck: ["BT1-028", "BT1-028"],
            security: ["BT1-028"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("host").instanceId, s.inst("victim").instanceId);
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marsmon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 0);
      await settle();
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
        withSource ? [s.inst("marsmon").instanceId] : [s.inst("host").instanceId, s.inst("marsmon").instanceId],
      );
      expect(
        s.state.players[0]!.battleArea.filter(
          (permanent) => permanent.topCard.instanceId === s.inst("host").instanceId,
        ).flatMap((permanent) => permanent.stack.map((card) => card.instanceId)),
      ).toEqual(withSource ? [] : [s.inst("tsunomon").instanceId]);
      expect(
        s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("host").instanceId)
          ?.currentDP,
      ).toBe(withSource ? undefined : 6000);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
        withSource ? [s.inst("host").instanceId, s.inst("tsunomon").instanceId].sort() : [],
      );
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
        s.inst("discount").instanceId,
      ]);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
        withSource
          ? [s.inst("victim").instanceId, s.inst("victimSource").instanceId].sort()
          : [s.inst("victim").instanceId],
      );
      expect(s.state.memory).toBe(3);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    });
  }

  it("removes the inherited battle DP before a public Piercing security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-046",
            as: "host",
            under: [
              { card: "ST2-01", as: "tsunomon" },
              { card: "BT1-028", as: "rookie" },
              { card: "BT1-037", as: "champion" },
              { card: "BT1-038", as: "ultimate" },
            ],
          },
        ],
        deck: ["BT1-028"],
        security: ["BT1-028"],
      },
      1: {
        battleArea: [{ card: "BT1-026", as: "victim", suspended: true }],
        deck: ["BT1-028"],
        security: [{ card: "BT1-026", as: "security" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(11000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(10);
    const checks = s.events.filter((event) => event.kind === "securityChecked");
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({
      resolution: "battle",
      battle: { attackerDeleted: true, securityDigimonDeleted: true },
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [
        s.inst("tsunomon").instanceId,
        s.inst("rookie").instanceId,
        s.inst("champion").instanceId,
        s.inst("ultimate").instanceId,
        s.inst("host").instanceId,
      ].sort(),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("victim").instanceId, s.inst("security").instanceId].sort(),
    );
  });
});
