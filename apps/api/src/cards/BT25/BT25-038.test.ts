import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_038 } from "./BT25-038.js";
import "../index.js";

describe("BT25-038 Shakkoumon", () => {
  it("keeps the printed alternate and DNA digivolution routes", () => {
    expect(BT25_038.digivolutionRequirement).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);
    expect(BT25_038.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 4 },
          { color: "Blue", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 4 },
          { color: "Black", level: 4 },
        ],
      },
    ]);
  });

  it("places an eligible Digimon as security and conditionally trashes both security tops", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_038.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTopOrBottom",
        controller: "mine",
        amount: 1,
        optional: true,
        source: {
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            trait: ["Angel", "Archangel", "Three Great Angels", "Iliad"],
            zone: ["hand", "digivolutionCards"],
            hostFilter: { kind: ["Digimon"] },
          },
          count: 1,
        },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "mine",
        bothPlayers: true,
        amount: 1,
        // Structured gate — a "raw" kind evaluates as unmet, so the trash would never happen.
        condition: { kind: "isDnaDigivolving", raw: "DNA digivolving" },
      });
    }
  });

  it("watches only the controller's security additions/removals", () => {
    const effects = BT25_038.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(effects).toHaveLength(2);
    const watchers = (effects ?? []).map((effect) => ({
      frequency: effect.frequency,
      watcher: effect.actions?.[0] as { event?: string; sourceFilter?: unknown; fireCondition?: unknown },
    }));
    expect(watchers).toEqual(
      expect.arrayContaining([
        {
          frequency: "OncePerTurn",
          watcher: expect.objectContaining({
            event: "whenAddSecurity",
            fireCondition: { kind: "triggerSecurityIsYours" },
          }),
        },
        { frequency: "OncePerTurn", watcher: expect.objectContaining({ sourceFilter: { controller: "mine" } }) },
      ]),
    );
    const addWatcher = watchers.find(({ watcher }) => watcher.event === "whenAddSecurity");
    expect(addWatcher?.watcher.sourceFilter).toBeUndefined();
  });

  it("places a qualifying Digimon from this Digimon's stack at the chosen security edge", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-038", as: "shakkou", under: [{ card: "BT25-037", as: "stackAngel" }] }],
          security: [{ card: "BT1-009", as: "existing" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("shakkou"));

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT25-037"]);
    expect(s.perm("shakkou").stack).toHaveLength(0);
  });

  it.each([
    ["Angel", "BT1-053"],
    ["Archangel", "BT1-060"],
    ["Three Great Angels", "BT1-063"],
    ["Iliad", "BT25-037"],
  ])("accepts each printed trait branch from hand: %s", async (_trait, card) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-038", as: "shakkou" }],
          hand: [{ card }],
          security: [{ card: "BT1-009", as: "existing" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("shakkou"));
    expect(s.state.players[0]!.security.map((c) => c.cardId)).toEqual([card, "BT1-009"]);
  });

  it("sources any own Digimon stack while excluding Tamer and opponent stacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-038", as: "shakkou" },
            { card: "BT1-060", as: "ownHost", under: [{ card: "BT1-053", as: "ownStack" }] },
            { card: "BT24-102", as: "tamer", under: [{ card: "BT1-060", as: "tamerStack" }] },
          ],
          security: [{ card: "BT1-009", as: "existing" }],
        },
        1: { battleArea: [{ card: "BT1-062", as: "opponentHost", under: [{ card: "BT1-053" }, { card: "BT1-060" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("shakkou"));
    expect(s.state.players[0]!.security.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-053"]);
    expect(s.perm("ownHost").stack).toHaveLength(0);
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("opponentHost").stack).toHaveLength(1);
    expect(s.perm("opponentHost").topCard?.cardId).toBe("BT1-060");
  });

  it("supports top placement and explicit refusal", async () => {
    const top = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-038", as: "shakkou" }],
          hand: [{ card: "BT1-053" }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    await advance(top.engine).fireForPermanent(EffectTiming.OnPlay, top.perm("shakkou"));
    expect(top.state.players[0]!.security.map((c) => c.cardId)).toEqual(["BT1-053", "BT1-009"]);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-038", as: "shakkou" }],
          hand: [{ card: "BT1-053" }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(declined.engine).fireForPermanent(EffectTiming.OnPlay, declined.perm("shakkou"));
    expect(declined.state.players[0]!.security.map((c) => c.cardId)).toEqual(["BT1-009"]);
    expect(declined.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-053"]);
  });

  it("does not select an opponent's card or a non-Digimon card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-038", as: "shakkou" }],
          hand: [{ card: "BT24-102", as: "tamer" }],
          security: [{ card: "BT1-009", as: "existing" }],
        },
        1: { hand: [{ card: "BT25-037", as: "opponentAngel" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("shakkou"));

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-102");
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT25-037");
  });

  it("trashes both players' top security cards only on a DNA digivolution", async () => {
    const dna = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-038", as: "shakkou" }], security: ["BT1-009"] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(dna.engine).fireForPermanent(EffectTiming.OnPlay, dna.perm("shakkou"), { isDnaDigivolve: true });
    expect(dna.state.players[0]!.security).toHaveLength(0);
    expect(dna.state.players[1]!.security).toHaveLength(0);

    const ordinary = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-038", as: "shakkou" }], security: ["BT1-009"] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(ordinary.engine).fireForPermanent(EffectTiming.OnPlay, ordinary.perm("shakkou"));
    expect(ordinary.state.players[0]!.security).toHaveLength(1);
    expect(ordinary.state.players[1]!.security).toHaveLength(1);
  });

  it("de-digivolves once when your security stack is added to", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-038", as: "shakkou" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-053"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-053");
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    expect(s.perm("target").stack).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 1 });
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("naturally emits the security-addition event from its digivolving placement clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-037", as: "base" }],
          hand: [{ card: "BT25-038", as: "shakkou" }],
          security: [{ card: "BT1-009", as: "existing" }],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-053"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const targetPermanent = s.state.players[1]!.battleArea[0]!;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT25-038" && targetPermanent.stack.length === 1);

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT25-037"]);
    expect(targetPermanent.stack).toHaveLength(0);
    expect(targetPermanent.topCard?.cardId).toBe("BT1-053");
  });

  it("publicly DNA digivolves from yellow and black level 4s and trashes both top security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-037", as: "yellow" },
            { card: "BT25-066", as: "black" },
          ],
          hand: [{ card: "BT25-038", as: "shakkou" }],
          security: [{ card: "BT1-009", as: "mineTop" }],
        },
        1: { security: [{ card: "BT1-010", as: "opponentTop" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("black").permanentId],
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-038"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    const merged = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-038")!;
    expect(merged.stack.map((card) => card.cardId)).toContain("BT25-037");
    expect(merged.stack.map((card) => card.cardId)).toContain("BT25-066");
  });

  it("publicly DNA digivolves from yellow and blue level 4s and trashes both top security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-037", as: "yellow" },
            { card: "BT25-023", as: "blue" },
          ],
          hand: [{ card: "BT25-038", as: "shakkou" }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-038"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    const merged = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-038")!;
    expect(merged.stack.map((card) => card.cardId)).toContain("BT25-023");
    expect(merged.stack.map((card) => card.cardId)).toContain("BT25-037");
  });

  it("inherits a once-per-turn -4000 DP reaction to your security removal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-062", as: "host", under: ["BT25-038"] }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT25-039", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const baseDp = s.perm("target").currentDP;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("target").currentDP).toBe(baseDp);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("target").currentDP).toBe(baseDp - 4000);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("target").currentDP).toBe(baseDp - 4000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(baseDp);
  });

  it("orders the security effect before the inherited removal reaction (Q6305)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-062", as: "host", under: ["BT25-038"] }],
          security: [{ card: "AD1-020", as: "securityTamer" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("securityTamer").instanceId,
        ),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(6000);
    const securityEffect = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "AD1-020",
    );
    const inheritedReaction = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-038",
    );
    expect(securityEffect).toBeGreaterThanOrEqual(0);
    expect(inheritedReaction).toBeGreaterThan(securityEffect);
  });
});
