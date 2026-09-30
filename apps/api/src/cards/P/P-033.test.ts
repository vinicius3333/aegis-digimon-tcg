import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-105.js";
import "../BT6/BT6-111.js";
import "./P-033.js";

describe("P-033 Sunarizamon", () => {
  it("gives Piercing to all own black Digimon at 13000 DP or more", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-033", as: "sunarizamon" },
          { card: "EX1-073", as: "largeBlack", dp: 13_000 },
          { card: "BT2-047", as: "smallBlack", dp: 12_000 },
        ],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasPierce(s.perm("largeBlack"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("smallBlack"))).toBe(false);
  });

  it("grants Security Attack +1 while inherited by a 13000 DP black Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-073", as: "host", dp: 13_000, under: ["P-033"] }],
      },
    });
    await s.ready();
    await settle(() => observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("stops extra checks when the first security card de-digivolves its host below 13000 DP (Q4147)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-073",
              as: "attacker",
              dp: 13_000,
              under: ["P-033", "BT2-064"],
            },
          ],
        },
        1: {
          security: [
            { card: "BT2-105", as: "deDigivolveSecurity" },
            { card: "BT1-009", as: "remainingSecurity" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const remainingId = s.inst("remainingSecurity").instanceId;
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.cardId === "BT2-064" &&
        observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack") === 0,
      2_000,
    );

    expect(s.perm("attacker").topCard.cardId).toBe("BT2-064");
    expect(s.perm("attacker").currentDP).toBe(12_000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([remainingId]);
  });
});

describe("P-033 Sunarizamon — KB Q&A rulings", () => {
  it("gives <Piercing> to a black Digimon whose [When Attacking] raises it to 13000 DP (Q4145)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-033" }, { card: "BT6-111", as: "attacker" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "defender", suspended: true, dp: 1000 }],
          security: [{ card: "BT1-009", as: "checked" }, { card: "BT1-009", as: "kept" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 2 },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("attacker").currentDP).toBe(11_000);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("attacker").currentDP).toBe(13_000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
  });

  it("gives its inherited <Security Attack +1> once [When Attacking] raises the black host to 13000 DP (Q4146)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-111", as: "attacker", under: ["P-033"] }] },
        1: { security: ["BT1-009", "BT1-009", { card: "BT1-009", as: "kept" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 2 },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("attacker").currentDP).toBe(11_000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("attacker").currentDP).toBe(13_000);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
  });
});
