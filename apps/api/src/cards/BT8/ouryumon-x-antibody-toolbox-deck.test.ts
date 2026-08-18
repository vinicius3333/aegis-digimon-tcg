import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-109.js";
import "./BT8-060.js";
import "./BT8-063.js";
import "./BT8-066.js";
import "./BT8-069.js";

describe("BT8 Ouryumon X Antibody toolbox deck", () => {
  it("tracks duplicate hosts by permanent, applies Ouryumon's errata globally, and caps it once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT8-069",
            as: "ouryumon",
            under: ["BT8-060", "BT8-063", "BT8-066"],
          },
          { card: "BT1-010", as: "firstHost" },
          { card: "BT1-010", as: "secondHost" },
        ],
        hand: [
          { card: "BT9-109", as: "firstXAntibody" },
          { card: "BT9-109", as: "secondXAntibody" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();

    const ouryumon = s.perm("ouryumon");
    const printedDp = getCardDefinition("BT8-069")!.dp;
    const firstOptionId = s.inst("firstXAntibody").instanceId;
    const secondOptionId = s.inst("secondXAntibody").instanceId;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: firstOptionId,
    })).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return req?.kind === "chooseTargets" && req.sourceCardId === "BT9-109";
    });

    const firstDecision = s.decisions.at(-1)!.req;
    expect(firstDecision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.perm("firstHost").permanentId,
      s.perm("secondHost").permanentId,
    ]));
    expect(firstDecision.options?.candidateInstanceIds).not.toContain(
      s.perm("firstHost").topCard.instanceId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: firstDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("firstHost").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("firstHost").stack.some(({ instanceId }) => instanceId === firstOptionId) &&
      ouryumon.currentDP === printedDp + 2000,
    );

    // BT8-069's 2022 errata says a source placed under ONE OF your Digimon triggers it.
    // The card was placed under firstHost, not Ouryumon itself.
    expect(s.perm("firstHost").stack[0]?.instanceId).toBe(firstOptionId);
    expect(ouryumon.currentDP).toBe(printedDp + 2000);

    const decisionCount = s.decisions.length;
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: secondOptionId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.decisions.length > decisionCount &&
      s.decisions.at(-1)?.req.kind === "chooseTargets" &&
      s.decisions.at(-1)?.req.sourceCardId === "BT9-109",
    );

    const secondDecision = s.decisions.at(-1)!.req;
    expect(secondDecision.options?.candidateInstanceIds).not.toContain(
      s.perm("firstHost").permanentId,
    );
    expect(secondDecision.options?.candidateInstanceIds).toContain(
      s.perm("secondHost").permanentId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: secondDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("secondHost").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("secondHost").stack.some(({ instanceId }) => instanceId === secondOptionId),
    );

    expect(s.perm("secondHost").stack[0]?.instanceId).toBe(secondOptionId);
    expect(ouryumon.currentDP).toBe(printedDp + 2000);
    assertNoLoudGap(s);
  });

  it("uses inherited Blocker and stays suspended after blocking despite Reboot reminder text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT8-069",
          as: "ouryumonBlocker",
          under: ["BT8-060", "BT8-063", "BT8-066"],
        }],
      },
      1: {
        battleArea: [{ card: "AD1-001", dp: 5000, as: "attacker" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const blocker = s.perm("ouryumonBlocker");
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const blockWindow = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(blockWindow).toMatchObject({ eligibleBlockerIds: [blocker.permanentId] });
    expect(s.engine.applyIntent(0, {
      type: "declareBlock",
      blockerPermanentId: blocker.permanentId,
    })).toEqual({ ok: true });
    await settle(() =>
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    // Reboot changes only the opponent-turn unsuspend phase. Its parenthetical reminder is
    // not an effect that can immediately undo the suspension paid to block.
    expect(blocker.isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
