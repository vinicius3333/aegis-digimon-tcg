import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-071.js";
import "../index.js";

const CARD_ID = "EX10-071";

describe("EX10-071 Paradise Lost", () => {
  it("records the exact catalog and complete trash/Main contracts", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Paradise Lost",
      colors: ["Purple", "Yellow"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Seven Great Demon Lords"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "EndOfYourTurn")).toMatchObject({
      isFromTrash: true,
      // The Lucemon gate is a WHOLE-clause condition: `runEffect` returns before any action runs.
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] } },
      actions: [
        {
          kind: "trashSecurityTop",
          controller: "mine",
          count: 1,
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] } },
          cost: {
            kind: "return",
            target: { filter: { isSelfRef: true, zone: "trash" }, from: ["trash"] },
            to: "deckBottom",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          withoutSuspending: true,
        },
      ],
    });
    const main = compiled.effects.find(({ trigger }) => trigger === "Main")!;
    expect(main.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { bindAs: "lucemonBuffTarget" },
      keyword: { keyword: "Raid" },
    });
    for (const action of main.actions.slice(1)) {
      expect(action).toMatchObject({ target: { fromSelectionRef: "lucemonBuffTarget" } });
    }
  });

  it("Q5185/Q5186 returns itself from trash and still makes a suspended Digimon attack with 0 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon", suspended: true }],
          trash: [{ card: CARD_ID, as: "paradise" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    await settle(() => s.events.some(({ kind }) => kind === "attackDeclared"));
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe(CARD_ID);
    expect(s.perm("lucemon").isSuspended).toBe(true);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(true);
  });

  it("trashes top security before the forced attack when security exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon" }],
          trash: [{ card: CARD_ID, as: "paradise" }],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("does not return itself or attack without a Lucemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009" }], trash: [{ card: CARD_ID, as: "paradise" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("CR 15-7-4: declining the bottom-deck condition keeps the card in trash and skips the attack", async () => {
    // FAILS-WHEN-REVERTED: drop `optional: true` from the trashSecurityTop action and the return
    // cost is auto-paid with no prompt, so Paradise Lost leaves the trash and the attack happens
    // whether the controller wanted it or not.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-060", as: "lucemon" }],
          trash: [{ card: CARD_ID, as: "paradise" }],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.inst("paradise"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.events.some(({ kind }) => kind === "attackDeclared")).toBe(false);
  });

  it("waives the Purple/Yellow requirement only while a Lucemon is on the field", async () => {
    // BT18-086 Lucemon: Larva is WHITE, so it supplies neither of this Option's printed colors —
    // the play can only succeed through the [Static] WaiveColorRequirement.
    // FAILS-WHEN-REVERTED: drop the waiver (or its `youHave` Lucemon condition) => the second
    // play is rejected for the same reason as the first.
    // `await ready()` matters: the waiver is a CONTINUOUS grant, and only a recompute pass
    // writes it into the ledger that `colorRequirementMet` reads.
    const noLucemon = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "paradise" }], battleArea: ["BT1-024"] } });
    noLucemon.state.memory = 2;
    await noLucemon.ready();
    expect(
      noLucemon.engine.applyIntent(0, { type: "playCard", instanceId: noLucemon.inst("paradise").instanceId }),
    ).toMatchObject({ ok: false, reason: "color-requirement-unmet" });

    const withLucemon = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "paradise" }], battleArea: [{ card: "BT18-086", as: "larva" }] },
    });
    withLucemon.state.memory = 2;
    await withLucemon.ready();
    expect(
      withLucemon.engine.applyIntent(0, { type: "playCard", instanceId: withLucemon.inst("paradise").instanceId }),
    ).toEqual({ ok: true });
  });

  it("Main offers every Lucemon-named Digimon and no other, then buffs exactly one of them", async () => {
    // Trait/name mix: two different Lucemon prints plus a vanilla non-Lucemon Digimon.
    // FAILS-WHEN-REVERTED (name filter): drop the `nameOrTrait` gate => the vanilla Digimon is
    // offered and can be buffed. FAILS-WHEN-REVERTED (bindAs/fromSelectionRef): re-resolve each
    // grant independently => the three keywords and the DP can land on different Digimon, so the
    // "one Digimon carries all four" assertion goes red.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "paradise" }],
          battleArea: [
            { card: "EX10-060", as: "satanMode" },
            { card: "EX10-013", as: "rookieLucemon" },
            { card: "BT1-024", as: "decoy" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const decoyDp = s.perm("decoy").currentDP;
    const dpBefore = new Map(["satanMode", "rookieLucemon"].map((alias) => [alias, s.perm(alias).currentDP] as const));

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paradise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      ["satanMode", "rookieLucemon"].some((alias) => s.perm(alias).currentDP === dpBefore.get(alias)! + 3000),
    );

    const offered = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).not.toContain(s.perm("decoy").permanentId);

    const buffed = ["satanMode", "rookieLucemon"].filter(
      (alias) => s.perm(alias).currentDP === dpBefore.get(alias)! + 3000,
    );
    expect(buffed).toHaveLength(1);
    const target = s.perm(buffed[0]!);
    expect(observe(s.engine).hasKeyword(target, "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(target)).toBe(true);
    expect(observe(s.engine).hasKeyword(target, "Blocker")).toBe(true);
    expect(s.perm("decoy").currentDP).toBe(decoyDp);
    expect(observe(s.engine).hasKeyword(s.perm("decoy"), "Raid")).toBe(false);
  });

  it("Security offers only Lucemon cards and plays nothing when the trash has none", async () => {
    const mixed = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "paradise" }],
          trash: [
            { card: "BT1-024", as: "decoy" },
            { card: "EX10-060", as: "lucemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await mixed.ready();
    await advance(mixed.engine).fireForInstance(EffectTiming.SecuritySkill, mixed.inst("paradise"));
    await settle(() => mixed.state.players[0]!.battleArea.length > 0);
    expect(mixed.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX10-060"]);
    expect(mixed.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-024");

    const none = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "paradise" }], trash: ["BT1-024"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await none.ready();
    await advance(none.engine).fireForInstance(EffectTiming.SecuritySkill, none.inst("paradise"));
    await settle(() => false, 60);
    expect(none.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("Security refusal plays nothing even with a Lucemon in the trash", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "paradise" }], trash: [{ card: "EX10-060", as: "lucemon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("paradise"));
    await settle(() => false, 60);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX10-060");
  });

  it("Main grants Raid, Piercing, Blocker, and +3000 DP to the same Lucemon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "paradise" }], battleArea: [{ card: "EX10-060", as: "lucemon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    const before = s.perm("lucemon").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("paradise").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lucemon").currentDP === before + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("lucemon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
    expect(s.perm("lucemon").currentDP).toBe(before + 3000);
  });

  it("Security optionally plays a Lucemon from trash without paying", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "paradise" }], trash: [{ card: "EX10-060", as: "lucemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("paradise"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-060")).toBe(true);
  });
});
