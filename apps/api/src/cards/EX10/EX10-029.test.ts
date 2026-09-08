import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
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
    // Catalog quirk: the printed link requirement separates "[Appmon]" from "trait" with a
    // non-breaking space (U+00A0), so normalise before comparing.
    expect(getCardDefinition(CARD_ID)?.linkRequirement?.replace(/\u00a0/g, " ")).toBe("[Link] [Appmon] trait: Cost 2");
    // Warpmon prints no inherited effect and no separate Security text: the [Security] clause
    // lives in the main effect text.
    expect(getCardDefinition(CARD_ID)?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition(CARD_ID)?.securityEffectText).toBeUndefined();
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    // Warpmon prints no [Digivolve] line; its only route is the catalog evoCost.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.linkRequirement).toEqual([{ cost: 2, traits: ["Appmon"] }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
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
    expect(compiled.effects?.find((effect) => effect.isLinked === true)).toMatchObject({
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
      // The source card really became the digivolution card beneath Warpmon.
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
      expect(s.perm("base").currentDP).toBe(4000);
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
    await settle();
    const warp = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).hasKeyword(warp, "Blocker")).toBe(true);
    expect(warp.controllerSeat).toBe(1);
    expect(warp.isSuspended).toBe(false);
    // "At the end of the battle": Warpmon fights the security battle first (4000 DP against
    // the 3000 DP attacker) and only then arrives on the security player's board.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("＜Blocker＞ really blocks: it redirects an attack off the player and wins the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-013"] },
      1: {
        battleArea: [{ card: CARD_ID, as: "warp" }],
        security: [
          { card: "BT1-013", as: "secTop" },
          { card: "BT1-014", as: "secBottom" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("warp"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("warp").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    // No security was checked, and Warpmon's 4000 DP beat the 3000 DP attacker: both security
    // cards are still there, in their original order.
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secBottom").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.perm("warp").isSuspended).toBe(true);
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
            // BT21-101 Gaiamon prints ＜Link +1＞ and carries the [Appmon] trait, so the second
            // link slot comes from a real printed keyword rather than a ledger grant.
            { card: "BT21-101", as: "host", suspended: true, linked: [{ card: "BT26-010", as: "sameHost" }] },
            { card: "BT21-009", as: "neighbor", linked: [{ card: "BT26-010", as: "neighborLink" }] },
            { card: "BT1-009", as: "target" },
          ],
          hand: [{ card: CARD_ID, as: "warp" }],
        },
        1: { security: ["BT1-009", "BT1-013"], deck: ["BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
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
    // The host really did hold two link cards at once: Gaiamon's own [Once Per Turn]
    // "when your Digimon get linked" clause paid its unsuspend cost off the same link.
    expect(accepted.perm("host").isSuspended).toBe(false);
    expect(accepted.state.players[1]!.security).toHaveLength(1);

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

  it("the De-Digivolve protection lasts through the opponent's turn and expires at its end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host" },
            { card: "BT10-081", as: "target", under: ["BT10-074"] },
          ],
          hand: [{ card: CARD_ID, as: "warp" }, "BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "foe" }],
          hand: ["BT1-009"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("warp").instanceId, s.perm("target").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("warp").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cantBeDeDigivolved"));

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // Still protected across the whole of the opponent's turn.
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeDeDigivolved")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeDeDigivolved")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // The restriction flag alone is not proof: a real ＜De-Digivolve＞ effect must bounce off the
  // protected Digimon on the opponent's turn. EX7-046 Jazarichmon prints "[On Play]
  // ＜De-Digivolve 1＞ 1 of your opponent's Digimon", so the opponent drives it with a public
  // `play` intent inside the real turn loop.
  const deDigivolveBoard = () => ({
    0: {
      battleArea: [
        { card: "BT21-009", as: "host" },
        { card: "BT10-081", as: "target", under: ["BT10-074"] },
      ],
      hand: [{ card: CARD_ID, as: "warp" }, "BT1-009"],
      deck: ["BT1-013", "BT1-014", "BT1-009"],
      security: ["BT1-013", "BT1-014"],
    },
    1: {
      hand: [{ card: "EX7-046", as: "jazari" }, "BT1-009"],
      deck: ["BT1-013", "BT1-014", "BT1-009"],
      security: ["BT1-013", "BT1-014"],
    },
  });

  it("a real ＜De-Digivolve＞ cannot demote the protected Digimon, but demotes it without the link", async () => {
    const preferred: string[] = [];
    const s = setupEngine(deDigivolveBoard(), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
    });
    preferred.push(s.inst("warp").instanceId, s.perm("target").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("warp").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cantBeDeDigivolved"));

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("jazari").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX7-046"));
    await settle();

    // The Lv.5 top and its Lv.4 digivolution card are both untouched, and nothing reached trash.
    expect(s.perm("target").topCard.cardId).toBe("BT10-081");
    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT10-074"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    // Control: identical board and identical opponent play, but Warpmon is never linked, so the
    // same ＜De-Digivolve 1＞ trashes the Lv.5 top and leaves the Lv.4 card on top.
    const controlPreferred: string[] = [];
    const control = setupEngine(deDigivolveBoard(), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: controlPreferred,
    });
    controlPreferred.push(control.perm("target").permanentId);
    const controlLoop = control.engine.startTurnLoop();
    await advance(control.engine).waitForMainPhase(0);
    advance(control.engine).endMainPhaseIfOpen(0);
    await advance(control.engine).waitForMainPhase(1);
    control.state.memory = 8;
    expect(control.engine.applyIntent(1, { type: "playCard", instanceId: control.inst("jazari").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => control.perm("target").topCard.cardId === "BT10-074");
    await settle();
    expect(control.perm("target").stack).toHaveLength(0);
    expect(control.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-081"]);

    expect(control.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await controlLoop;
  });
});
