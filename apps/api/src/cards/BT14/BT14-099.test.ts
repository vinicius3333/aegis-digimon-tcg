import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-099.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-099", () => {
  it("trashes three deck cards and grants Devimon Security Attack +1", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "TrashTopDeck", controller: "mine", amount: 3 });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "forTheTurn",
    });
  });
  it("activates main in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));

  it("naturally mills three cards, grants Devimon Security Attack +1, and uses it in combat", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-075", as: "devimon" }],
          hand: [{ card: "BT14-099", as: "option" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { security: ["BT1-004", "BT1-005"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT1-003") &&
        observe(s.engine).keywordAmount(s.perm("devimon"), "SecurityAttack") === 1,
    );

    expect(s.state.players[0]!.trash.filter((card) => ["BT1-001", "BT1-002", "BT1-003"].includes(card.cardId)).map((card) => card.cardId)).toEqual([
      "BT1-001",
      "BT1-002",
      "BT1-003",
    ]);
    expect(observe(s.engine).keywordAmount(s.perm("devimon"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("devimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("naturally mills and buffs the controller's Devimon when revealed in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT14-075", as: "devimon" }],
          security: [{ card: "BT14-099", as: "securityOption" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003") &&
        observe(s.engine).keywordAmount(s.perm("devimon"), "SecurityAttack") === 1,
    );

    expect(s.state.players[1]!.trash.filter((card) => ["BT1-001", "BT1-002", "BT1-003"].includes(card.cardId)).map((card) => card.cardId)).toEqual([
      "BT1-001",
      "BT1-002",
      "BT1-003",
    ]);
    expect(observe(s.engine).keywordAmount(s.perm("devimon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT14-099")).toBe(true);
  });
});
