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
          security: ["BT1-001"],
          deck: ["BT1-003"],
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

  it("grants Jamming only once across two own-security removal events in the same turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-048", as: "firstRecipient" },
            { card: "BT1-045", as: "source", under: ["BT13-003"] },
            { card: "BT1-049", as: "secondRecipient" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstRecipient").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Jamming"));

    preferred.splice(0, preferred.length, s.perm("secondRecipient").topCard.instanceId);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle();

    const grants = (advance(s.engine).ledgers.continuous as unknown as { keywordGrants: { permanentId: string }[] })
      .keywordGrants;
    expect(grants).toHaveLength(1);
    expect(grants[0]!.permanentId).toBe(s.perm("firstRecipient").permanentId);
    expect(observe(s.engine).hasKeyword(s.perm("firstRecipient"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("secondRecipient"), "Jamming")).toBe(false);
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
      1: { security: ["BT1-001"] },
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
