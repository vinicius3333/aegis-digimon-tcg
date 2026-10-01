import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-024.js";
import "../index.js";

describe("BT16-024", () => {
  it("searches security and optionally digivolves into an Angel", () => {
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Search",
        searchZone: "security",
        purpose: "digivolveAmongRevealed",
        count: "all",
        to: "revealed",
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Digivolve",
        reduceCost: 2,
        from: ["security"],
        amongPreviousSearch: true,
        optional: true,
      });
    }
  });

  it("can place an Angel from hand into security and grants inherited Blocker", () => {
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["hand"],
      toTop: false,
      optional: true,
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "forTheTurn" }],
    });
  });

  it("grants Blocker to your Angel-family Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-010"],
        battleArea: [
          { card: "BT1-009", as: "source", under: ["BT16-024"] },
          { card: "BT16-019", as: "angel" },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { deck: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("source").permanentId, "Blocker")).toBe(false);
    expect(continuous.hasKeyword(s.perm("angel").permanentId, "Blocker")).toBe(true);
    expect(continuous.hasKeyword(s.perm("other").permanentId, "Blocker")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("naturally searches the whole security stack, digivolves for the reduced cost, and shuffles the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-024", as: "magna" }],
          security: [
            { card: "BT2-040", as: "ophanimon" },
            { card: "BT1-001", as: "other" },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("magna").topCard?.cardId === "BT2-040");

    expect(s.perm("magna").topCard?.cardId).toBe("BT2-040");
    expect(s.perm("magna").stack.map(({ cardId }) => cardId)).toEqual(["BT16-024"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.state.memory).toBe(3);
    expect(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT16-024")
        .map(({ req }) => req.options?.effectTextPart),
    ).toEqual([
      "[On Play] [When Digivolving] If it's your turn, search your security stack. This Digimon may digivolve into a Digimon card with the [Angel] or [Three Great Angels] trait among them with the digivolution cost reduced by 2.",
      "If this effect digivolved, you may place 1 Digimon card with the [Angel], [Archangel] or [Three Great Angels] trait from the hand at the bottom of your security stack.",
    ]);
  });
});

describe("BT16-024 MagnaAngemon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  const DIGIVOLVE_TEXT =
    "This Digimon may digivolve into a Digimon card with the [Angel] or [Three Great Angels] trait";
  const PLACE_TEXT = "you may place 1 Digimon card with the [Angel], [Archangel] or [Three Great Angels] trait";

  function offersContaining(s: ReturnType<typeof setupEngine>, text: string) {
    return s.decisions.filter(
      ({ req }) => req.sourceCardId === "BT16-024" && (req.options?.effectTextPart ?? "").includes(text),
    );
  }

  function digivolveOffers(s: ReturnType<typeof setupEngine>) {
    return offersContaining(s, DIGIVOLVE_TEXT);
  }

  function playMagnaAngemon(s: ReturnType<typeof setupEngine>): void {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
  }

  it("may decline to digivolve after searching, and the searched cards go back into security (Q2619)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-024", as: "magna" }],
          security: [
            { card: "BT2-040", as: "ophanimon" },
            { card: "BT1-009", as: "monodramon" },
            { card: "BT1-013", as: "muchomon" },
          ],
          deck: [...FILLER],
        },
        1: { security: 3, deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    playMagnaAngemon(s);
    await settle(() => digivolveOffers(s).length > 0);

    const [offer] = digivolveOffers(s);
    expect(offer!.req.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: offer!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(digivolveOffers(s)).toHaveLength(1);
    expect(s.perm("magna").topCard?.cardId).toBe("BT16-024");
    expect(s.perm("magna").stack).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(new Set(s.state.players[0]!.security.map(({ instanceId }) => instanceId))).toEqual(
      new Set([s.inst("ophanimon").instanceId, s.inst("monodramon").instanceId, s.inst("muchomon").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("performs the digivolution bonus draw before the rest of the effect, so the drawn Angel can go under security (Q2620)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-024", as: "magna" }],
          security: [
            { card: "BT2-040", as: "ophanimon" },
            { card: "BT1-009", as: "monodramon" },
          ],
          deck: [{ card: "BT1-055", as: "drawnAngemon" }, ...FILLER],
        },
        1: { security: 3, deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    playMagnaAngemon(s);
    await settle(() => s.state.players[0]!.security.length === 2 && s.perm("magna").topCard?.cardId === "BT2-040");
    await settle();

    expect(s.perm("magna").topCard?.cardId).toBe("BT2-040");
    expect(offersContaining(s, PLACE_TEXT)).toHaveLength(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("monodramon").instanceId,
      s.inst("drawnAngemon").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("resolves the digivolved card's [When Digivolving] only after the remaining cards are back in security (Q2621)", async () => {
    let securityWhenRecovered: string[] | undefined;
    let recoveredInstanceId = "";
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-024", as: "magna" }],
          security: [
            { card: "EX6-028", as: "seraphimon" },
            { card: "BT1-009", as: "monodramon" },
            { card: "BT1-013", as: "muchomon" },
          ],
          deck: [{ card: "BT1-009", as: "bonusDraw" }, { card: "BT1-013", as: "recovered" }, ...FILLER],
        },
        1: { security: 3, deck: [...FILLER] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        onEvent: () => {
          if (recoveredInstanceId === "" || securityWhenRecovered !== undefined) return;
          const security = s.state.players[0]!.security;
          if (security.some(({ instanceId }) => instanceId === recoveredInstanceId)) {
            securityWhenRecovered = security.map(({ instanceId }) => instanceId);
          }
        },
      },
    );
    recoveredInstanceId = s.inst("recovered").instanceId;
    s.state.memory = 10;
    await s.ready();

    playMagnaAngemon(s);
    await settle(() => securityWhenRecovered !== undefined);
    await settle();

    expect(s.perm("magna").topCard?.cardId).toBe("EX6-028");
    expect(securityWhenRecovered).toBeDefined();
    expect(new Set(securityWhenRecovered)).toEqual(
      new Set([s.inst("monodramon").instanceId, s.inst("muchomon").instanceId, recoveredInstanceId]),
    );
    expect(securityWhenRecovered?.[0]).toBe(recoveredInstanceId);
  });

  it("lets the player order the digivolved Seraphimon's [When Digivolving] and its [All Turns] security trigger (Q3747)", async () => {
    async function resolveWithFirst(preferTriggerKeys: string[]) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT16-024", as: "magna" },
              { card: "BT1-055", as: "angemon" },
            ],
            security: [
              { card: "EX6-028", as: "seraphimon" },
              { card: "BT1-009", as: "monodramon" },
            ],
            deck: [{ card: "BT1-009", as: "bonusDraw" }, { card: "BT1-013", as: "recovered" }, ...FILLER],
          },
          1: { battleArea: [{ card: "BT1-050", as: "liollmon" }], security: 3, deck: [...FILLER] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferTriggerKeys },
      );
      s.state.memory = 10;
      await s.ready();

      playMagnaAngemon(s);
      await settle(() => s.state.players[0]!.security.length === 3);
      await settle();

      expect(s.perm("magna").topCard?.cardId).toBe("EX6-028");
      const orderPrompts = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
      expect(orderPrompts).toHaveLength(1);
      expect(orderPrompts[0]!.req.options?.triggerTimings).toEqual(["WhenDigivolving", "AllTurns"]);
      expect(orderPrompts[0]!.req.options?.triggerCardIds).toEqual(["EX6-028", "EX6-028"]);
      return s.state.players[1]!.hand.map(({ cardId }) => cardId);
    }

    // Recovery first makes 3 security cards, so the level 3 Liollmon can be returned.
    expect(await resolveWithFirst(["::EX6-028/ir-"])).toEqual(["BT1-050"]);
    // The bounce first sees only 2 security cards, so the level 3 Liollmon stays.
    expect(await resolveWithFirst(["subtrigger"])).toEqual([]);
  });
});
