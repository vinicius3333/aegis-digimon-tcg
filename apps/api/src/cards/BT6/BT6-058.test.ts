import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT3/BT3-019.js";
import "../BT4/BT4-045.js";
import "./BT6-058.js";

describe("BT6-058 Nanimon", () => {
  it("arms its play for the end of the Security battle", () => {
    expect(runtimeCompiledCard("BT6-058")?.effects[0]).toMatchObject({
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
    });
  });

  it("plays itself after its Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-058", as: "security" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("security").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
      5000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-058")).toBe(true);
  });

  it("plays itself even when the attacker loses the Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-058", as: "security" }] },
      1: { battleArea: [{ card: "BT6-047", as: "attacker", dp: 500 }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("security").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId),
      5000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-058")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT6-058 Nanimon — KB Q&A rulings", () => {
  it("is a normal Digimon once played, so Security Digimon DP boosts stop applying to it (Q1450)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-045", as: "maycrackmon" }],
        security: [{ card: "BT6-058", as: "nanimon" }],
      },
      1: { battleArea: [{ card: "BT1-057", dp: 5000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const nanimonId = s.inst("nanimon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    // As a Security Digimon it battled at 2000 + 4000 DP and beat the 5000 DP attacker.
    expect(
      s.events.find((event) => event.kind === "securityChecked" && event.revealedCardId === "BT6-058"),
    ).toMatchObject({ battle: { securityCardDP: 6000, attackerDeleted: true } });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === nanimonId);
    expect(played?.controllerSeat).toBe(0);
    expect(played?.currentDP).toBe(2000);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("is played at the end of the battle even when it loses to the attacker (Q1451)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-058", as: "nanimon" }] },
      1: { battleArea: [{ card: "BT1-057", dp: 7000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const nanimonId = s.inst("nanimon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    expect(
      s.events.find((event) => event.kind === "securityChecked" && event.revealedCardId === "BT6-058"),
    ).toMatchObject({ resolution: "battle", battle: { securityDigimonDeleted: true, attackerDeleted: false } });
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-057"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([nanimonId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === nanimonId)).toBe(false);
  });

  it("is played after its battle and before the attacker's next security check (Q1452)", async () => {
    let nanimonInPlayAtSecondCheck: boolean | undefined;
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT6-058", as: "nanimon" },
            { card: "BT1-009", as: "secondSecurity" },
          ],
        },
        1: { battleArea: [{ card: "BT3-019", as: "attacker" }] },
      },
      {
        onEvent(event: ServerEvent) {
          if (event.kind === "securityRevealed" && event.revealedCardId === "BT1-009") {
            nanimonInPlayAtSecondCheck = s.state.players[0]!.battleArea.some(
              (permanent) => permanent.topCard.instanceId === s.inst("nanimon").instanceId,
            );
          }
        },
      },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const nanimonId = s.inst("nanimon").instanceId;
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    const nanimonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT6-058",
    );
    const nanimonPlayed = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "battleArea" && event.instanceIds.includes(nanimonId),
    );
    const secondReveal = s.events.findIndex(
      (event) => event.kind === "securityRevealed" && event.revealedCardId === "BT1-009",
    );
    expect(s.events[nanimonCheck]).toMatchObject({ resolution: "battle" });
    expect(nanimonPlayed).toBeGreaterThan(nanimonCheck);
    expect(secondReveal).toBeGreaterThan(nanimonPlayed);
    expect(nanimonInPlayAtSecondCheck).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
