import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-056.js";
import "./index.js";

describe("BT17-056 Locomon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-056")).toMatchObject({
      cardId: "BT17-056",
      nameEn: "Locomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Machine"],
      effectText:
        "[All Turns] [Once Per Turn] When an attack target is switched, reveal the top 3 cards of your deck. Place 1 [Parasitemon] or 1 level 5 or lower black Digimon card among them as this Digimon's bottom digivolution card. Trash the rest.  [All Turns] When one of your Digimon's effects adds to this Digimon's digivolution cards, this Digimon may digivolve into [GroundLocomon] in the hand without paying the cost.",
      inheritedEffectText:
        "[Your Turn] While this Digimon has the [Machine]\u00a0trait, it gains ＜Collision＞ (During this Digimon's attack, all of your opponent's Digimon gain ＜Blocker＞, and must block if possible).",
    });

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(3);

    // Clause 1: [All Turns] [Once Per Turn] attack-target-switch reveal 3, place 1 eligible
    // card as the BOTTOM digivolution card (`to: "placeUnder"` under this Digimon), trash rest.
    // [Parasitemon] is a printed EXACT name reference -> `nameExact`, not substring `name`.
    expect(compiled.effects[0]).toEqual({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              rest: "trash",
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Parasitemon"], match: "nameExact" }],
                  },
                  orFilters: [
                    {
                      controllerDefault: "mine",
                      kind: ["Digimon"],
                      colors: ["Black"],
                      levelComparison: { op: "lte", value: 5 },
                    },
                  ],
                  count: 1,
                  to: "placeUnder",
                  underFilter: { isSelfRef: true },
                },
              ],
            },
          ],
        },
      ],
    });

    // Clause 2: [All Turns] free digivolve into [GroundLocomon] (exact name) from the hand
    // when one of your Digimon's effects adds to THIS Digimon's digivolution cards.
    expect(compiled.effects[1]).toEqual({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          raw: "When one of your Digimon's effects adds to this Digimon's digivolution cards, this Digimon may digivolve into [GroundLocomon] in the hand without paying the cost",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["GroundLocomon"], match: "nameExact" }],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
            },
          ],
        },
      ],
    });

    // Inherited: [Your Turn] ＜Collision＞ while the host has the [Machine] trait (exact trait).
    expect(compiled.effects[2]).toEqual({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Collision", raw: "＜Collision＞" } },
          while: {
            kind: "youHave",
            filter: {
              isSelfRef: true,
              nameOrTrait: [{ tokens: ["Machine"], match: "trait" }],
            },
            raw: "this Digimon has the [Machine] trait",
          },
        },
      ],
    });
  });

  it("places a revealed black card underneath, trashes the rest, and free-digivolves after a natural target switch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-056", as: "locomon" },
            { card: "BT17-059", as: "diaboromon" },
          ],
          hand: [{ card: "BT17-058", as: "groundLocomon" }],
          deck: [
            { card: "BT17-052", as: "eligible" },
            { card: "BT1-087", as: "remainderOne" },
            { card: "BT1-102", as: "remainderTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "attackerOne" },
            { card: "BT17-053", as: "attackerTwo" },
          ],
          security: [{ card: "BT1-009", as: "securityDigimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    const remainderIds = [s.inst("remainderOne").instanceId, s.inst("remainderTwo").instanceId];
    const groundLocomonId = s.inst("groundLocomon").instanceId;
    const attackerOneId = s.inst("attackerOne").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locomon").topCard?.instanceId === groundLocomonId);

    // The blocked attack switched the target; the reveal placed the level-3 BLACK Digimon
    // under Locomon (bottom digivolution card) and trashed the Tamer and the Option.
    expect(s.perm("locomon").stack.some((card) => card.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(remainderIds));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    // Adding a digivolution card by this Digimon's own effect offered the free digivolve into
    // [GroundLocomon] from hand, so the host's top card is now GroundLocomon and the hand is empty.
    expect(s.perm("locomon").topCard?.cardId).toBe("BT17-058");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === attackerOneId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "gameOver"));
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("reveals only once per turn and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-056", as: "locomon" },
            // Two Diaboromon: each carries its OWN [Once Per Turn] attack-target switch, so
            // the same turn can produce two switches and expose Locomon's own once-per-turn gate.
            { card: "BT17-059", as: "switcherOne" },
            { card: "BT17-059", as: "switcherTwo" },
            { card: "BT17-059", as: "switcherThree" },
          ],
          hand: [{ card: "BT1-102", as: "spare" }],
          security: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
          deck: [
            { card: "BT17-052", as: "firstEligible" },
            { card: "BT1-087", as: "firstRest" },
            { card: "BT1-102", as: "secondRest" },
            { card: "BT17-053", as: "secondEligible" },
            "BT1-087",
            "BT1-102",
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "attackerOne", dp: 30_000 },
            { card: "BT17-053", as: "attackerTwo", dp: 30_000 },
          ],
          hand: [{ card: "BT1-102", as: "opponentSpare" }],
          security: [{ card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstEligibleId = s.inst("firstEligible").instanceId;
    const secondEligibleId = s.inst("secondEligible").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locomon").stack.some((card) => card.instanceId === firstEligibleId));
    expect(s.state.players[0]!.deck).toHaveLength(3);

    // Second switch in the SAME turn: [Once Per Turn] refuses, so no further reveal.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.trash.length >= 0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.perm("locomon").stack.some((card) => card.instanceId === secondEligibleId)).toBe(false);

    // Next own turn resets the once-per-turn gate: a switch reveals again.
    const attackPhase = s.state.phase;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    s.state.phase = attackPhase;
    await advance(s.engine).verb.unsuspend([s.perm("attackerOne").permanentId, s.perm("switcherThree").permanentId]);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locomon").stack.some((card) => card.instanceId === secondEligibleId));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("grants inherited Collision to a Machine host and withholds it from a non-Machine host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-058", under: ["BT17-056"], as: "machineHost" },
          { card: "BT17-059", under: ["BT17-056"], as: "unidentifiedHost" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("machineHost"), "Collision")).toBe(true);
    // Comparative peer: same inherited source, same controller, but Diaboromon is
    // [Unidentified], so the [Machine]-trait condition withholds ＜Collision＞.
    expect(observe(s.engine).hasKeyword(s.perm("unidentifiedHost"), "Collision")).toBe(false);
  });
});
