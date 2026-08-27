import { describe, expect, it } from "vitest";
import { EffectTiming, effectiveStaticNames, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX11-066.js";
import "../BT11/BT11-070.js";
import "../P/P-094.js";

describe("EX11-066 Xeno", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-066")).toMatchObject({
      nameEn: "Xeno",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("is also treated as Zenith by its printed Rule in every zone", async () => {
    expect(effectiveStaticNames(getCardDefinition("EX11-066")!)).toEqual(["Xeno", "Zenith"]);
    expect(compiled.effects).toContainEqual({
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Zenith"],
        },
      ],
    });

    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-066", as: "xeno" }] } });
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("xeno"))).toEqual(expect.arrayContaining(["xeno", "zenith"]));
  });

  it("accepts a card with Vemmon in its text for the start-phase cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-066", as: "xeno" }], hand: ["P-244"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("xeno"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-244")).toBe(true);
    assertNoLoudGap(s);
  });

  it("gains the memory without asking, since only the trash cost is optional", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-066", as: "xeno" }], hand: ["P-244"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("xeno"));
    expect(s.state.memory).toBe(1);
    const optionalPrompts = s.decisions.filter((d) => d.req.kind === "optional");
    expect(optionalPrompts).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not gain memory when the Vemmon discard cost is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-066", as: "xeno" }], hand: ["P-244"], deck: ["BT1-001"] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("xeno"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("asks before suspending for the [All Turns] clause and skips it when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-066", as: "xeno" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("vemmon").permanentId });

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("xeno").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.perm("vemmon").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("suspends and places the revealed Vemmon cards when accepted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-066", as: "xeno" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("vemmon").permanentId });
    await settle(() => s.perm("xeno").isSuspended);

    expect(s.perm("xeno").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(Array.from(s.perm("vemmon").stack, (card) => card.cardId)).toContain("BT11-061");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    assertNoLoudGap(s);
  });

  it("lets the controller order two copies that trigger off the same digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-066", as: "firstXeno" },
            { card: "EX11-066", as: "secondXeno" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-001", "BT11-061", "BT1-002"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("vemmon").permanentId,
    });
    await settle(() => s.perm("firstXeno").isSuspended && s.perm("secondXeno").isSuspended);

    const ordering = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
    expect(ordering).toHaveLength(1);
    expect(ordering[0]!.req.options?.triggerKeys).toHaveLength(2);
    expect(s.perm("firstXeno").isSuspended).toBe(true);
    expect(s.perm("secondXeno").isSuspended).toBe(true);
  });

  it("orders the digivolving card's own effect together with both watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-061", as: "vemmon" },
            { card: "EX11-066", as: "firstXeno" },
            { card: "EX11-066", as: "secondXeno" },
          ],
          hand: [{ card: "BT11-070", as: "destromon" }],
          deck: ["BT11-061", "BT1-001", "BT11-061", "BT1-002", "BT11-061", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vemmon").permanentId,
        instanceId: s.inst("destromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("vemmon").topCard.cardId === "BT11-070");
    await settle(() => s.perm("firstXeno").isSuspended && s.perm("secondXeno").isSuspended);

    // One digivolution, one prompt: Destromon's own [When Digivolving] and both Xeno watchers
    // compete in the same ordering decision instead of the printed effect always going first.
    const ordering = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(ordering?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT11-070", "EX11-066", "EX11-066"]));
    expect(ordering?.req.options?.triggerKeys).toHaveLength(3);
  });

  it("orders a played card's own [On Play] together with the watcher it triggered", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-066", as: "xeno" }],
          hand: [{ card: "P-094", as: "destromon" }],
          deck: ["BT11-061", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("destromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("xeno").isSuspended);

    // The play is one event: the played card's [On Play] and the Xeno watcher it triggered are
    // offered in the same ordering prompt, and the watcher resolves exactly once.
    const ordering = s.decisions.find(({ req }) => req.kind === "orderTriggers");
    expect(ordering?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["P-094", "EX11-066"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not ask to order a copy that is already suspended and cannot pay", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-066", as: "firstXeno" },
            { card: "EX11-066", as: "secondXeno" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.perm("secondXeno").isSuspended = true;

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("vemmon").permanentId,
    });
    await settle(() => s.perm("firstXeno").isSuspended);

    expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(false);
    expect(s.perm("firstXeno").isSuspended).toBe(true);
  });

  it("ignores a digivolution in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-066", as: "xeno" }],
          breeding: { card: "BT11-061", as: "vemmon" },
          deck: ["BT11-061", "BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("vemmon").permanentId,
    });

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(false);
    expect(s.perm("xeno").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.perm("vemmon").stack).toHaveLength(0);
  });

  it("publishes full exclusive IR with Q5932 text matching and exact reveal dispositions", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "Draw",
          cost: { kind: "trash", target: { filter: { zone: "hand", nameOrTrait: vemmonTextMatcher() } } },
        },
        { kind: "GainMemory", amount: 1 },
      ]);
    }
    const watchers = compiled.effects.find((effect) => effect.trigger === "AllTurns")!.actions;
    expect(watchers).toHaveLength(2);
    for (const watcher of watchers) {
      expect(watcher).toMatchObject({
        kind: "SubTrigger",
        sourceFilter: { nameOrTrait: vemmonTextMatcher() },
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 2,
            add: [
              {
                filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }] },
                count: "all",
                to: "placeUnder",
                underFilter: { isTriggerSource: true },
              },
            ],
            rest: "trash",
            cost: { kind: "suspend" },
          },
        ],
      });
    }
  });
});

function vemmonTextMatcher() {
  return [{ tokens: ["Vemmon"], match: "text" }];
}
