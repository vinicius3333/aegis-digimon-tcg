import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-016.js";
import "../index.js";

const CARD_ID = "EX10-016";

describe("EX10-016 Mirrormon", () => {
  it("records the exact catalog, evolution, link, linked cost, and self-linked watcher", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["Tool"],
      types: ["Mirror"],
      linkDp: 2000,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(compiled.effects?.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Suspend",
          optional: true,
          abortOnDecline: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
          cost: {
            kind: "trash",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], zone: "linked", isSelfRef: true },
              count: 1,
            },
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Suspend", optional: true, target: { count: 1 } }],
        },
      ],
    });
  });

  it.each([
    ["normal green route", "BT1-007", false],
    ["alternate Appmon route", "BT21-005", true],
  ])("uses the %s for cost 0", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: CARD_ID, as: "mirrormon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirrormon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("mirrormon").instanceId);

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
  });

  it("rejects a non-Appmon red level 2, links only to Appmon for 1, and contributes +2000 DP", async () => {
    const evolution = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: CARD_ID, as: "mirrormon" }],
      },
    });
    evolution.state.memory = 1;
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("redEgg").permanentId,
        instanceId: evolution.inst("mirrormon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    const link = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "notAppmon" },
        ],
        hand: [{ card: CARD_ID, as: "mirrormon" }],
      },
    });
    link.state.memory = 1;
    await link.ready();
    const baseDp = link.perm("appmon").currentDP;

    expect(
      link.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: link.inst("mirrormon").instanceId,
        targetPermanentId: link.perm("notAppmon").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      link.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: link.inst("mirrormon").instanceId,
        targetPermanentId: link.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => link.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));

    expect(link.state.memory).toBe(0);
    expect(link.perm("appmon").currentDP).toBe(baseDp + 2000);
    assertNoLoudGap(link);
  });

  it("suspends 1 only when this Digimon gets linked and only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "mirrormon" },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT24-053", as: "firstLink" },
            { card: "BT24-053", as: "neighborLink" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-010", as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 2;
    preferred.push(s.perm("firstTarget").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("neighborLink").instanceId,
        targetPermanentId: s.perm("neighbor").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("neighbor").linked.some(({ instanceId }) => instanceId === s.inst("neighborLink").instanceId),
    );
    expect(s.perm("firstTarget").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("mirrormon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").isSuspended);
    expect(s.perm("secondTarget").isSuspended).toBe(false);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("mirrormon").permanentId,
    });
    expect(s.perm("secondTarget").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("may refuse the self-linked suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "mirrormon" }],
          hand: [{ card: "BT24-053", as: "link" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("mirrormon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mirrormon").linked.length === 1);

    expect(s.perm("target").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Q5046 may trash itself as cost and suspends exactly 2 of 3 opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "mirror" }] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mirror").instanceId);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("third").isSuspended).toBe(false);
  });

  it("Q5047 may trash another card on the same Link +1 host, and the linked effect may be refused", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT21-009",
              as: "host",
              linked: [
                { card: CARD_ID, as: "mirror" },
                { card: "BT26-010", as: "otherLink" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      accepted.inst("otherLink").instanceId,
      accepted.perm("first").permanentId,
      accepted.perm("second").permanentId,
    );
    (
      accepted.engine as unknown as {
        continuous: {
          addLinkMaxGrant(permanentId: string, delta: number, duration: EffectDuration): void;
        };
      }
    ).continuous.addLinkMaxGrant(accepted.perm("host").permanentId, 1, EffectDuration.UntilEachTurnEnd);
    await accepted.ready();

    await advance(accepted.engine).fire(EffectTiming.OnUseAttack, accepted.perm("host"));
    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("mirror").instanceId,
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("otherLink").instanceId,
    );
    expect(accepted.perm("first").isSuspended).toBe(true);
    expect(accepted.perm("second").isSuspended).toBe(true);

    const declined = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "mirror" }] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).fire(EffectTiming.OnUseAttack, declined.perm("host"));
    expect(declined.perm("host").linked).toHaveLength(1);
    expect(declined.perm("first").isSuspended).toBe(false);
    expect(declined.perm("second").isSuspended).toBe(false);
  });
});
