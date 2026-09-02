import { describe, expect, it } from "vitest";
import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-029.js";
import "../index.js";

const CARD_ID = "EX10-029";

describe("EX10-029 Warpmon compiled contract", () => {
  it("records the exact catalog and compiled contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["System"],
      types: ["Transmission"],
      linkDp: 3000,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    // Warpmon prints no [Digivolve] line; its only route is the catalog evoCost.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.linkRequirement).toEqual([{ cost: 2, traits: ["Appmon"] }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects?.find((effect) => effect.actions[0]?.kind === "SubTrigger")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          optional: true,
          cost: { kind: "trash", target: { filter: { zone: "linked", isSelfRef: true }, count: 1 } },
          actions: [
            {
              kind: "SelectBind",
            },
            {
              kind: "Restrict",
              restriction: "cantBeDeDigivolved",
              duration: "untilOpponentTurnEnd",
              target: { fromSelectionRef: "A" },
            },
          ],
        },
      ],
    });
  });

  it("evolves for 2 on any black level-3 base, and links only to Appmon for 2", async () => {
    for (const baseCard of ["BT10-058", "BT21-053"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: CARD_ID, as: "warp" }] },
      });
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("warp").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
    const link = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: [{ card: CARD_ID, as: "warp" }],
      },
    });
    link.state.memory = 2;
    await link.ready();
    const baseDp = link.perm("appmon").currentDP;
    expect(
      link.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: link.inst("warp").instanceId,
        targetPermanentId: link.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      link.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: link.inst("warp").instanceId,
        targetPermanentId: link.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => link.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(link.state.memory).toBe(0);
    expect(link.perm("appmon").currentDP).toBe(baseDp + 3000);

    // No printed alternate route: a non-black level-3 base is rejected outright, and a legal
    // black level-3 base still costs the printed 2 rather than any alternate.
    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: CARD_ID, as: "warp" }] },
    });
    wrongColor.state.memory = 2;
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("base").permanentId,
        instanceId: wrongColor.inst("warp").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("Security plays Warpmon for free and the resulting permanent has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "attacker" }] }, 1: { security: [CARD_ID] } });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    const warp = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).hasKeyword(warp, "Blocker")).toBe(true);
  });

  it("Q5084 trashes Warpmon itself and protects exactly the selected Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host" },
            { card: "BT10-081", as: "protected", under: ["BT10-074"] },
            { card: "BT1-009", as: "other" },
          ],
          hand: [{ card: CARD_ID, as: "warp" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("warp").instanceId, s.perm("protected").permanentId);
    s.state.memory = 2;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("protected"), "cantBeDeDigivolved")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("warp").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "cantBeDeDigivolved"));
    await settle();
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("warp").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("other"), "cantBeDeDigivolved")).toBe(false);
  });

  it("Q5085 trashes another same-host link, never a neighboring link, and may decline", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host", linked: [{ card: "BT26-010", as: "sameHost" }] },
            { card: "BT21-009", as: "neighbor", linked: [{ card: "BT26-010", as: "neighborLink" }] },
            { card: "BT1-009", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "warp" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    advance(accepted.engine).ledgers.continuous.addLinkMaxGrant(
      accepted.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    preferred.push(accepted.inst("sameHost").instanceId, accepted.perm("target").permanentId);
    accepted.state.memory = 2;
    await accepted.ready();
    expect(
      accepted.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: accepted.inst("warp").instanceId,
        targetPermanentId: accepted.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(accepted.engine).isRestricted(accepted.perm("target"), "cantBeDeDigivolved"));
    await settle();
    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("warp").instanceId,
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("sameHost").instanceId,
    );
    expect(accepted.perm("neighbor").linked.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("neighborLink").instanceId,
    );

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host" },
            { card: "BT1-009", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "warp" }],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 2;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: declined.inst("warp").instanceId,
        targetPermanentId: declined.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.perm("host").linked.length === 1);
    expect(observe(declined.engine).isRestricted(declined.perm("target"), "cantBeDeDigivolved")).toBe(false);
  });
});
