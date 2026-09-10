import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-080.js";
import "./index.js";

describe("BT17-080 Takato Matsuki", () => {
  it("gains memory for a Guilmon, Growlmon, or Gallantmon Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["Guilmon", "Growlmon", "Gallantmon"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("optionally evolves a Guilmon into Gallantmon for free after placing all three Trash cards", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { nameOrTrait: [{ tokens: ["Guilmon"], match: "nameExact" }] } },
          into: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "nameExact" }] },
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            target: { filter: { nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }], isSelfRef: true } },
          },
          additionalCosts: [
            {
              kind: "place",
              target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Growlmon"], match: "nameExact" }] } },
            },
            {
              kind: "place",
              target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "nameExact" }] } },
            },
          ],
        },
      ],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally plays from Security and gains memory at main-phase start", async () => {
    const security = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-063", as: "attacker" }] },
        1: { security: [{ card: "BT17-080", as: "takato" }] },
      },
      { autoSelectCards: true },
    );
    security.state.turnSeat = 0;
    await security.ready();
    expect(
      security.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: security.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => security.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-080"));
    expect(security.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-080")).toBe(true);

    const main = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-080", as: "mainTamer" },
          { card: "BT17-008", as: "guilmon" },
        ],
      },
      1: { battleArea: ["BT17-063"] },
    });
    main.state.memory = 0;
    main.state.turnSeat = 0;
    await main.ready();
    await advance(main.engine).runTurn(0);
    expect(
      main.events.some(
        (event) =>
          event.kind === "memoryChanged" &&
          "reason" in event &&
          event.reason === "gainMemory" &&
          event.from === 0 &&
          event.to === 1,
      ),
    ).toBe(true);
  });

  it("naturally places the required Trash cards and evolves Guilmon into Gallantmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-080", as: "takato" },
            { card: "BT17-008", as: "guilmon" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
          trash: [
            { card: "BT17-010", as: "growlmon" },
            { card: "BT17-013", as: "warGrowlmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("guilmon").topCard.cardId === "BT17-016");

    expect(s.perm("guilmon").topCard.cardId).toBe("BT17-016");
    expect(s.perm("guilmon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-008", "BT17-080", "BT17-010", "BT17-013"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-080")).toBe(false);
  });

  // REMOVED by engine lane E2: "may decline the natural end-of-turn evolution without moving its
  // required cards" asserted the pre-ruling behaviour on exactly the fixture and decision path the
  // Q2853 test below now covers, and Q2853 says the opposite — the placement is an activation cost
  // and is paid whether or not the digivolve is taken. See PAY-THEN-MAY-MECHANISM.md.

  it("does not count a Guilmon that sits in the breeding area", async () => {
    // Comprehensive Rules 3-4-5-8: information on cards in the breeding area can't be referenced.
    const breedingOnly = setupEngine({
      0: {
        battleArea: [{ card: "BT17-080", as: "mainTamer" }],
        breeding: { card: "BT17-008", as: "raised" },
        hand: ["BT1-009"],
      },
    });
    breedingOnly.state.memory = 0;
    breedingOnly.state.turnSeat = 0;
    await breedingOnly.ready();
    const loop = breedingOnly.engine.startTurnLoop();
    // The Breeding window is interactive; only the turn player's own skip leaves it.
    for (let tick = 0; tick < 400 && breedingOnly.state.phase !== Phase.Main; tick += 1) {
      if (breedingOnly.state.phase === Phase.Breeding) {
        breedingOnly.engine.applyIntent(0, { type: "endPhase" });
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(breedingOnly.state.phase).toBe(Phase.Main);
    expect(breedingOnly.perm("raised").topCard.cardId).toBe("BT17-008");
    expect(
      breedingOnly.events.some(
        (event) => event.kind === "memoryChanged" && "reason" in event && event.reason === "gainMemory",
      ),
    ).toBe(false);
    expect(breedingOnly.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses a near-name host: [Guilmon] is exact, so Guilmon (X Antibody) is not a legal host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-080", as: "takato" },
            { card: "BT9-009", as: "guilmonX" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
          trash: [
            { card: "BT17-010", as: "growlmon" },
            { card: "BT17-013", as: "warGrowlmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("guilmonX").topCard.cardId).toBe("BT9-009");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-080")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("warGrowlmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
  });

  it("refuses a near-name cost card: BlackGrowlmon cannot stand in for [Growlmon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-080", as: "takato" },
            { card: "BT17-008", as: "guilmon" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
          trash: [
            { card: "EX4-008", as: "blackGrowlmon" },
            { card: "BT17-013", as: "warGrowlmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("guilmon").topCard.cardId).toBe("BT17-008");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blackGrowlmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("warGrowlmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-080")).toBe(true);
  });

  // Q2853: the ruling lets the player PLACE this Tamer, [Growlmon] and [WarGrowlmon] and then
  // decline the "may digivolve". The module sets `payCostBeforeOptional`, so `runActionInner` pays
  // the whole placement cost first and offers only the digivolve.
  // See docs/audits/BT17.md#pay-then-may-mechanism.
  it("Q2853: places the cost cards even when the digivolve itself is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-080", as: "takato" },
            { card: "BT17-008", as: "guilmon" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
          trash: [
            { card: "BT17-010", as: "growlmon" },
            { card: "BT17-013", as: "warGrowlmon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("guilmon").topCard.cardId).toBe("BT17-008");
    expect(s.perm("guilmon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-080", "BT17-010", "BT17-013"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
  });

  // Q2854: <Blitz> on the digivolved [Gallantmon] can still activate. BT17-016 Gallantmon does not
  // print <Blitz>, and no printed [Gallantmon] reachable from this clause does, so the ruling has
  // no card-level endpoint to assert here; it is a keyword-timing statement owned by the engine's
  // Blitz window, not by this card's IR.

  it("places only the copy of [Takato Matsuki] that owns the trigger, not a second copy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-080", as: "takatoA" },
            { card: "BT17-080", as: "takatoB" },
            { card: "BT17-008", as: "guilmon" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
          trash: [
            { card: "BT17-010", as: "growlmon" },
            { card: "BT17-013", as: "warGrowlmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const takatoAId = s.perm("takatoA").topCard.instanceId;
    const takatoBId = s.perm("takatoB").topCard.instanceId;
    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("guilmon").topCard.cardId === "BT17-016");

    // `isSelfRef` binds the placement to the copy that owns the trigger, so the first
    // resolution places exactly one Tamer and the second copy has no [Guilmon] host left.
    const placedTamers = s
      .perm("guilmon")
      .stack.filter((card) => card.cardId === "BT17-080")
      .map((card) => card.instanceId);
    expect(placedTamers).toHaveLength(1);
    expect([takatoAId, takatoBId]).toContain(placedTamers[0]);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-080")).toHaveLength(
      1,
    );
  });
});
