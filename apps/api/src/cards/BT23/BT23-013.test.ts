import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
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

  it("plays a differently named Sistermon from trash without cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-013", as: "jesmon" }], trash: [{ card: "BT23-076", as: "blanc" }] } },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 2;
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jesmon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("blanc").instanceId),
    );
    expect(s.state.memory).toBe(2);
  });

  it("rejects every Sistermon Ciel alias when Sistermon Ciel is already in play, per Q5224", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-013", as: "jesmon" },
            { card: "BT10-085", as: "existingCiel" },
          ],
          hand: [{ card: "ST12-13", as: "aliasCiel" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jesmon"));
    await settle();
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
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: token.permanentId } as never)).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(token.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("attacks once after another friendly Digimon is played outside an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-013", as: "jesmon" }],
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" } as never)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await advance(s.engine).verb.unsuspend([s.perm("jesmon").permanentId]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.players[1]!.security).toHaveLength(2);
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
});
