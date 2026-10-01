import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT3/BT3-019.js";
import "./BT6-056.js";

describe("BT6-056 Chikurimon", () => {
  it("arms De-Digivolve for the end of the Security battle", () => {
    expect(runtimeCompiledCard("BT6-056")?.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "DeDigivolve", amount: 1 }],
        },
      ],
    });
  });

  it("De-Digivolves an opposing Digimon after its Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-056", as: "security" }] },
      1: {
        battleArea: [{ card: "BT6-016", under: [{ card: "BT1-021", as: "source" }], as: "attacker", dp: 12000 }],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.instanceId === s.inst("source").instanceId, 5000);

    expect(s.perm("attacker").topCard?.instanceId).toBe(s.inst("source").instanceId);
  });

  it("still activates after losing the Security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-056", as: "security" }] },
      1: {
        battleArea: [
          { card: "BT6-047", as: "attacker", dp: 500 },
          { card: "BT6-016", under: [{ card: "BT1-021", as: "targetSource" }], as: "target", dp: 12000 },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.instanceId === s.inst("targetSource").instanceId, 5000);

    expect(s.perm("target").topCard?.instanceId).toBe(s.inst("targetSource").instanceId);
  });
});

describe("BT6-056 Chikurimon — KB Q&A rulings", () => {
  it("De-Digivolves at the end of the battle even when Chikurimon loses it (Q1448)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-056", as: "chikurimon" }] },
      1: {
        battleArea: [{ card: "BT6-016", under: [{ card: "BT1-021", as: "source" }], as: "attacker", dp: 12000 }],
      },
    });
    s.state.turnSeat = 1;
    const chikurimonId = s.inst("chikurimon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    const chikurimonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT6-056",
    );
    const deDigivolve = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.strippedStackTops?.reason === "deDigivolve",
    );
    expect(s.events[chikurimonCheck]).toMatchObject({
      resolution: "battle",
      battle: { securityDigimonDeleted: true, attackerDeleted: false },
    });
    expect(deDigivolve).toBeGreaterThan(chikurimonCheck);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chikurimonId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").topCard.instanceId).toBe(s.inst("source").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT6-016"]);
  });

  it("De-Digivolves after its battle ends and before the attacker's next security check (Q1449)", async () => {
    let targetTopAtSecondCheck: string | undefined;
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT6-056", as: "chikurimon" },
            { card: "BT1-009", as: "secondSecurity" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT3-019", as: "attacker" },
            { card: "BT6-016", under: [{ card: "BT1-021", as: "targetSource" }], as: "target" },
          ],
        },
      },
      {
        autoSelectCards: true,
        preferInstanceIds,
        onEvent(event: ServerEvent) {
          if (event.kind === "securityRevealed" && event.revealedCardId === "BT1-009") {
            targetTopAtSecondCheck = s.perm("target").topCard.cardId;
          }
        },
      },
    );
    s.state.turnSeat = 1;
    preferInstanceIds.push(s.perm("target").topCard.instanceId);
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);

    const chikurimonCheck = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT6-056",
    );
    const deDigivolve = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.strippedStackTops?.reason === "deDigivolve",
    );
    const secondReveal = s.events.findIndex(
      (event) => event.kind === "securityRevealed" && event.revealedCardId === "BT1-009",
    );
    expect(s.events[chikurimonCheck]).toMatchObject({ resolution: "battle" });
    expect(deDigivolve).toBeGreaterThan(chikurimonCheck);
    expect(secondReveal).toBeGreaterThan(deDigivolve);
    expect(targetTopAtSecondCheck).toBe("BT1-021");
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("targetSource").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
