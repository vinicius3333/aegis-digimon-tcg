import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-044.js";
import "../index.js";

describe("BT21-044 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves the GeoGreymon alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["GeoGreymon"], cost: 3, isAlternate: true }]);
  });

  it("grants one Marcus Damon the temporary Digimon, DP, restriction, and keyword effects", () => {
    const selectedMarcusTarget = { filter: {}, count: 1, fromSelectionRef: "bt21-044-marcus" };
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] },
            count: 1,
            bindAs: "bt21-044-marcus",
          },
        },
        {
          kind: "GrantStatic",
          target: selectedMarcusTarget,
          grant: "kinds",
          tokens: ["Digimon"],
          duration: "forTheTurn",
        },
        {
          kind: "SetBaseDP",
          target: selectedMarcusTarget,
          value: 3000,
          duration: "forTheTurn",
        },
        {
          kind: "Restrict",
          target: selectedMarcusTarget,
          restriction: "digivolve",
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: selectedMarcusTarget,
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: selectedMarcusTarget,
          keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          withoutSuspending: false,
          optional: true,
        },
      ]);
    }
  });

  it("shares one once-per-turn budget between the main and inherited deletion watchers", () => {
    const watchers = compiled.effects.filter((effect) => effect.trigger === "AllTurns");
    expect(watchers).toHaveLength(2);
    expect(watchers[0]).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "bt21-044-marcus-security" });
    expect(watchers[1]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "bt21-044-marcus-security",
      isInherited: true,
    });
    expect(watchers[0]?.actions).toEqual(watchers[1]?.actions);
  });

  it("enters through the public play intent with Marcus and attack hooks registered", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-044", as: "rizegreymon" }] } });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rizegreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("rizegreymon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("rizegreymon").instanceId)).toBe(
      true,
    );
  });

  it("publicly lets the selected Marcus Damon attack after On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-044", as: "rize" }],
          battleArea: [{ card: "BT13-095", as: "marcus" }],
        },
        1: { security: ["BT1-009", "BT1-001", "BT1-002"], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rize").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-044"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("marcus").permanentId && permanent.isSuspended,
      ),
    );
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("rize").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("rize").isSuspended).toBe(true);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Alliance")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not treat a combined Marcus Damon card name as exact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-021", as: "nearMarcus" }],
          hand: [{ card: "BT21-044", as: "rize" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rize").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT21-044"));

    expect(s.perm("nearMarcus").currentDP).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("nearMarcus"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nearMarcus"), "Alliance")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("nearMarcus"), "digivolve")).toBe(false);
  });

  it("observably turns exactly one Marcus into a 3000 DP Digimon with both keywords and no digivolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-044", as: "rize" },
            { card: "BT13-095", as: "chosenMarcus" },
            { card: "BT12-092", as: "otherMarcus" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosenMarcus").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rize"));

    expect(s.perm("chosenMarcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("chosenMarcus"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chosenMarcus"), "Alliance")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosenMarcus"), "digivolve")).toBe(true);
    expect(s.perm("otherMarcus").currentDP).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("otherMarcus"), "Rush")).toBe(false);
  });

  it("alternate-digivolves from GeoGreymon for 3 and resolves the optional attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-042", as: "geo" },
            { card: "BT13-095", as: "marcus" },
          ],
          hand: [{ card: "BT21-044", as: "rize" }],
        },
        1: { security: [{ card: "BT1-009", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").topCard.cardId === "BT21-044" && s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("places Marcus from trash on top of security after a yellow Tamer is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-044", as: "rize" },
            { card: "BT1-087", as: "yellowTamer" },
          ],
          trash: [{ card: "BT13-095", as: "marcus" }],
          security: [{ card: "BT1-009", as: "existingSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("yellowTamer").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("marcus").instanceId));

    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("marcus").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(false);
  });

  it("does not trigger the security recovery for a non-red, non-yellow Tamer deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-044", as: "rize" },
            { card: "BT8-087", as: "blueTamer" },
          ],
          trash: [{ card: "BT13-095", as: "marcus" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("blueTamer").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
  });
});
