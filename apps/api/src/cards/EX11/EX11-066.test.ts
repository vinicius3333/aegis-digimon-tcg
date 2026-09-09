import { describe, expect, it } from "vitest";
import { effectiveStaticNames, getCardDefinition, Phase } from "@aegis/shared";
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

  it("asks before suspending for the [All Turns] clause and skips it when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-066", as: "xeno" }],
          hand: [
            { card: "BT11-061", as: "cost" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vemmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.pendingDecision);

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
          battleArea: [{ card: "EX11-066", as: "xeno" }],
          hand: [
            { card: "BT11-061", as: "cost" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT11-061", "BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vemmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("xeno").isSuspended);

    expect(s.perm("xeno").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(Array.from(s.perm("vemmon").stack, (card) => card.cardId)).toContain("BT11-061");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    assertNoLoudGap(s);
  });

  it("runs Start Main publicly and gains memory after trashing Vemmon text from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-066", as: "xeno" }],
          hand: [{ card: "BT11-061", as: "cost" }],
          deck: ["BT11-061", "BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const turn = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT11-061")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("xeno").isSuspended).toBe(false);
    s.engine.applyIntent(0, { type: "endPhase" });
    await settle(() => s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("does not watch a Vemmon digivolving in the breeding area", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-066", as: "xeno" }],
          eggDeck: [{ card: "BT9-005", as: "egg" }],
          hand: [
            { card: "BT11-061", as: "cost" },
            { card: "BT11-061", as: "vemmon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId);
    const turn = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "BT9-005");
    expect(s.state.phase).toBe(Phase.Main);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("vemmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "BT11-061");
    expect(s.perm("xeno").isSuspended).toBe(false);
    // The turn draw and public Start Main cost/draw consume the two prepared cards;
    // no additional two-card watcher reveal occurred in breeding.
    expect(s.state.players[0]!.deck).toHaveLength(0);
    s.engine.applyIntent(0, { type: "endPhase" });
    await settle(() => s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-066", as: "xeno", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-066"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-066")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
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
          hand: [{ card: "BT11-070", as: "destromon" }],
          deck: ["BT11-061", "BT1-009", "BT11-061", "BT1-010"],
        },
      },
      { autoAcceptOptional: true },
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
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderTriggers"));

    const ordering = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
    expect(ordering).toHaveLength(1);
    expect(ordering[0]!.req.options?.triggerKeys).toHaveLength(3);
    expect(ordering[0]!.req.options?.triggerCardIds?.filter((cardId) => cardId === "EX11-066")).toHaveLength(2);
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
          deck: ["BT11-061", "BT1-009", "BT11-061", "BT1-010", "BT11-061", "BT1-011"],
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
          deck: ["BT11-061", "BT1-009"],
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
          ],
          hand: [{ card: "BT11-061", as: "vemmon" }],
          deck: ["BT11-061", "BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    s.perm("secondXeno").isSuspended = true;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("vemmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstXeno").isSuspended);

    expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(false);
    expect(s.perm("firstXeno").isSuspended).toBe(true);
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
      const gainMemory = compiled.effects.find((effect) => effect.trigger === trigger)!.actions[1] as {
        condition?: unknown;
      };
      expect(gainMemory.condition, `${trigger} memory gain must not depend on the draw`).toBeUndefined();
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
