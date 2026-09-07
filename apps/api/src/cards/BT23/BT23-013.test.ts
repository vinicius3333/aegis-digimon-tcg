import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-013.js";

describe("BT23-013 Jesmon", () => {
  it("matches the catalog and carries every modal, keyword, watcher, and evolution clause", () => {
    expect(getCardDefinition("BT23-013")).toMatchObject({
      cardId: "BT23-013",
      nameEn: "Jesmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
      effectText:
        "[Digivolve] [SaviorHuckmon]/Lv.5 w/[CS]\u00a0trait: Cost 3\n[Digivolve] While opponent has a 10000 DP or higher Digimon, [Huckmon]: Cost 5 \n\n＜Rush＞ \n＜Alliance＞ \n[When Digivolving] [When Attacking] You may play 1 [Atho, RenxE9 & Por] Token (Digimon/White/6000 DP/＜Reboot＞ ＜Blocker＞ ＜Decoy (Red/Black)＞) or, from your hand or trash, 1 Digimon card with [Sistermon]\u00a0in its name without paying the cost. This effect can't play cards with the same names as any of your Digimon.\n[Your Turn] [Once Per Turn] When any of your other Digimon are played, this Digimon may attack.",
    });
    const keywords = compiled.effects.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords);
    expect(keywords).toEqual([
      { keyword: "Rush", raw: "＜Rush＞" },
      { keyword: "Alliance", raw: "＜Alliance＞" },
    ]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "RestrictEffect",
        restriction: "cannotPlaySameNameAsOwnDigimon",
        scope: "thisEffect",
      });
      expect(actions[1]).toMatchObject({ kind: "Modal", optional: true, choose: 1, options: expect.any(Array) });
      expect(actions[1].options[0][0]).toMatchObject({
        kind: "PlayToken",
        token: {
          name: "Atho, René & Por",
          dp: 6000,
          color: "White",
          keywords: [{ keyword: "Reboot" }, { keyword: "Blocker" }, { keyword: "Decoy", colors: ["Red", "Black"] }],
        },
      });
      expect(actions[1].options[1][0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
      });
    }
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true }, optional: true }],
    });
    expect(compiled).toMatchObject({
      digivolutionRequirement: [
        { names: ["SaviorHuckmon"], level: 5, cost: 3, isAlternate: true },
        { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
        { names: ["Huckmon"], cost: 5, isAlternate: true, opponentDigimonDpMin: 10000 },
      ],
      coverage: "full",
      residual: [],
    });
    expect(digivolutionRequirementsFor("BT23-013")).toEqual(compiled.digivolutionRequirement);
  });

  it("plays the exact 6000-DP token with Reboot, Blocker, and red/black Decoy", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-013", as: "jesmon" }] } },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jesmon"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const token = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.permanentId !== s.perm("jesmon").permanentId,
    )!;

    expect(token.currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(token, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Decoy")).toBe(true);
  });

  it("resolves the modal from a public SaviorHuckmon evolution and can refuse it", async () => {
    const accepted = setupEngine(
      { 0: { battleArea: [{ card: "BT6-015", as: "base" }], hand: [{ card: "BT23-013", as: "jesmon" }] } },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    accepted.state.memory = 4;
    await accepted.ready();
    expect(
      accepted.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: accepted.perm("base").permanentId,
        instanceId: accepted.inst("jesmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.state.players[0]!.battleArea.length === 2);
    expect(accepted.state.memory).toBe(1);
    const token = accepted.state.players[0]!.battleArea.find(
      (p) => p.permanentId !== accepted.perm("base").permanentId,
    )!;
    expect(token.currentDP).toBe(6000);
    expect(observe(accepted.engine).hasKeyword(token, "Blocker")).toBe(true);

    const refused = setupEngine(
      { 0: { battleArea: [{ card: "BT6-015", as: "base" }], hand: [{ card: "BT23-013", as: "jesmon" }] } },
      { autoDeclineOptional: true },
    );
    refused.state.memory = 4;
    await refused.ready();
    expect(
      refused.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: refused.perm("base").permanentId,
        instanceId: refused.inst("jesmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => refused.perm("base").topCard.instanceId === refused.inst("jesmon").instanceId);
    expect(refused.state.players[0]!.battleArea).toHaveLength(1);
    expect(refused.state.memory).toBe(1);
  });

  it("plays a Sistermon from hand on a public evolution when no same-name copy exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-015", as: "base" }],
          hand: [
            { card: "BT23-013", as: "jesmon" },
            { card: "BT23-076", as: "blanc" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jesmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("blanc").instanceId),
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("blanc").instanceId)).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("publicly plays a differently named Sistermon from trash without cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-015", as: "base" }],
          hand: [{ card: "BT23-013", as: "jesmon" }],
          trash: [{ card: "BT23-076", as: "blanc" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jesmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("blanc").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("blanc").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blanc").instanceId)).toBe(false);
  });

  it("rejects every Sistermon Ciel alias when Sistermon Ciel is already in play, per Q5224", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-015", as: "base" },
            { card: "BT10-085", as: "existingCiel" },
          ],
          hand: [
            { card: "BT23-013", as: "jesmon" },
            { card: "ST12-13", as: "aliasCiel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jesmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("jesmon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("aliasCiel").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("lets the newly played token pay Alliance but does not nest Jesmon's watcher attack, per Q5222-Q5223", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-013", as: "jesmon" }] }, 1: { security: 3 } },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    const token = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.permanentId !== s.perm("jesmon").permanentId,
    )!;
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: token.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(token.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("attacks once after another friendly Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-013", as: "jesmon" }],
          hand: [
            { card: "ST1-02", as: "first" },
            { card: "ST1-02", as: "second" },
            { card: "ST1-02", as: "third" },
          ],
          deck: [
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-014",
            "BT1-015",
            "BT1-016",
            "BT1-017",
            "BT1-018",
            "BT1-019",
            "BT1-020",
          ],
        },
        1: {
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          deck: [
            "BT1-021",
            "BT1-022",
            "BT1-023",
            "BT1-024",
            "BT1-025",
            "BT1-026",
            "BT1-027",
            "BT1-028",
            "BT1-029",
            "BT1-030",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 5);
    expect(s.perm("jesmon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(5);
    await advance(s.engine).verb.unsuspend([s.perm("jesmon").permanentId]);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.memory).toBeGreaterThan(0);
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[0]!.battleArea.length === 4);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(5);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 4);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps SaviorHuckmon and level-5 CS as separate cost-3 paths and gates Huckmon cost 5", async () => {
    for (const [base, opponentCard, expected] of [
      ["BT6-015", undefined, true],
      ["BT22-023", undefined, true],
      ["BT13-009", "BT1-024", true],
      ["BT13-009", "BT1-059", false],
      ["BT13-009", undefined, false],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: "BT23-013", as: "jesmon" }],
            deck: ["BT1-009"],
          },
          ...(opponentCard === undefined ? {} : { 1: { battleArea: [{ card: opponentCard, as: "large" }] } }),
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();
      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jesmon").instanceId,
        ...(base === "BT6-015" ? { useAlternateCost: true } : {}),
      });
      expect(result.ok).toBe(expected);
      if (expected) {
        await settle(() => s.perm("base").topCard.instanceId === s.inst("jesmon").instanceId);
        expect(s.state.memory, base).toBe(base === "BT13-009" ? 1 : 3);
      } else {
        expect(s.state.memory).toBe(6);
      }
    }
  });

  it("publicly exercises Alliance, Reboot, and Blocker on the generated token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-013", as: "jesmon" }],
          deck: Array(10).fill("BT1-009"),
          security: Array(12).fill("BT1-001"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", suspended: true },
            { card: "BT1-010", as: "secondAttacker" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
      },
      { autoChooseOption: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attacker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const token = s.state.players[0]!.battleArea.find((p) => p.permanentId !== s.perm("jesmon").permanentId)!;
    expect(token.currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(token, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(token, "Decoy")).toBe(true);
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: token.permanentId })).toEqual({
      ok: true,
    });
    const tokenId = token.permanentId;
    let sawAllianceSuspension = false;
    await settle(() => {
      sawAllianceSuspension =
        sawAllianceSuspension ||
        s.state.players[0]!.battleArea.find((p) => p.permanentId === tokenId)?.isSuspended === true;
      return sawAllianceSuspension;
    });
    expect(sawAllianceSuspension).toBe(true);
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === tokenId)!.isSuspended).toBe(false);
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: tokenId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === tokenId)!.isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    { color: "red", card: "BT1-010", protected: true },
    { color: "black", card: "BT10-058", protected: true },
    { color: "blue", card: "BT1-027", protected: false },
  ])("public Gaia Force Decoy boundary for $color Digimon", async ({ card, protected: protectedByDecoy }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-013", as: "jesmon" },
            { card, as: "redTarget" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "ST1-16", as: "gaiaForce" }],
          battleArea: [
            { card: "BT1-009", as: "attackTarget", suspended: true },
            { card: "BT1-021", as: "redEnabler" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
      },
      { autoChooseOption: true, autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attackTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    const token = s.state.players[0]!.battleArea.find(
      (p) => p.permanentId !== s.perm("jesmon").permanentId && p.permanentId !== s.perm("redTarget").permanentId,
    )!;
    expect(token).toBeDefined();
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: token.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(decision.seat, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("redTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    if (protectedByDecoy) {
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const decoy = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(decoy.seat, {
          type: "respondDecision",
          decisionId: decoy.decisionId,
          response: { kind: "selectCards", instanceIds: [token.topCard.instanceId] },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => !observe(s.engine).isAttacking() && !s.state.pendingDecision);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("redTarget").instanceId)).toBe(
      protectedByDecoy,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === token.permanentId)).toBe(!protectedByDecoy);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly plays Huckmon then uses the conditional alternate evolution and Rush", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT23-006", as: "huckmon" },
            { card: "BT23-013", as: "jesmon" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "large" }],
          deck: Array(10).fill("BT1-010"),
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const huckmonId = s.inst("huckmon").instanceId;
    const jesmonId = s.inst("jesmon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: huckmonId })).toEqual({ ok: true });
    await settle(() => s.perm("huckmon").topCard.instanceId === huckmonId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("huckmon").permanentId,
        instanceId: jesmonId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("huckmon").topCard.instanceId === jesmonId);
    expect(s.perm("huckmon").stack[0]!.instanceId).toBe(huckmonId);
    expect(s.state.memory).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("huckmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("huckmon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
