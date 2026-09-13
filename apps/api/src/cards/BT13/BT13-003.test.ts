import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT18/BT18-036.js";
import "./BT13-003.js";

describe("BT13-003 Kyaromon", () => {
  it("grants Jamming when its controller's security is removed and expires at turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "kyaromonHost", under: ["BT13-003"] },
            { card: "BT1-046", as: "firstBase" },
            { card: "BT1-048", as: "firstRecipient" },
          ],
          hand: [{ card: "BT18-036", as: "firstWizardmon" }],
          security: ["BT1-010"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstRecipient").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Jamming"));

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Jamming")).toBe(false);
  });

  it("grants Jamming once across two own-security removals, then reuses the budget next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-048", as: "firstRecipient" },
            { card: "BT1-045", as: "source", under: [{ card: "BT13-003", as: "inheritedSource" }] },
            { card: "BT1-049", as: "secondRecipient" },
            { card: "BT1-050", as: "thirdRecipient" },
            { card: "BT1-046", as: "firstBase" },
            { card: "BT1-047", as: "secondBase" },
            { card: "BT1-046", as: "thirdBase" },
          ],
          hand: [
            { card: "BT18-036", as: "firstWizardmon" },
            { card: "BT18-036", as: "secondWizardmon" },
            { card: "BT18-036", as: "thirdWizardmon" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
        1: { hand: ["BT1-010"], deck: Array.from({ length: 8 }, () => "BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstRecipient").topCard.instanceId);
    const sourceId = s.inst("inheritedSource").instanceId;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toContain(sourceId);
    preferred.splice(0, preferred.length, s.perm("firstRecipient").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 2 && observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Jamming"),
    );
    expect(s.state.memory).toBe(9);

    preferred.splice(0, preferred.length, s.perm("secondRecipient").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("secondRecipient"), "Jamming")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.splice(0, preferred.length, s.perm("thirdRecipient").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("thirdBase").permanentId,
        instanceId: s.inst("thirdWizardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("thirdRecipient"), "Jamming"));
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("thirdRecipient"), "Jamming")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not trigger when the opponent's security is removed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-045", as: "source", under: ["BT13-003"] },
          { card: "BT1-048", as: "attacker", dp: 12000 },
          { card: "BT1-049", as: "recipient" },
        ],
      },
      1: { security: ["BT1-010"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming")).toBe(false);
  });
});
