import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-026.js";
import "./index.js";

describe("BT20-026 MegaSeadramon (X Antibody)", () => {
  it("returns level 4 or lower and conditionally restricts suspension on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
            to: "deckBottom",
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            restriction: "suspend",
            duration: "untilOpponentTurnEnd",
            condition: {
              kind: "selfDigivolutionStackHasTrait",
              filter: {
                nameOrTrait: [
                  { tokens: ["MegaSeadramon"], match: "name" },
                  { tokens: ["X Antibody"], match: "trait" },
                ],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "Restrict", restriction: "attackTargetChange", duration: "permanent", target: { isSelf: true } },
      ],
    });
  });

  it("bottoms only a level-4-or-lower Digimon and locks another Digimon from effect suspension", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-026", as: "megaX", under: ["BT15-029"] }] },
        1: {
          battleArea: [
            { card: "BT20-023", as: "level4" },
            { card: "BT20-025", as: "level5" },
            { card: "BT20-014", as: "locked" },
          ],
          deck: ["BT20-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level4").permanentId, s.perm("locked").permanentId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("megaX"));
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT20-023");
    expect(s.perm("level5")).toBeDefined();
    await advance(s.engine).verb.suspend([s.perm("locked").permanentId], 0);
    expect(s.perm("locked").isSuspended).toBe(false);
  });

  it("as an inherited source prevents a Blocker from changing the host's attack target on your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-027", as: "host", under: ["BT20-026"] }] },
        1: {
          battleArea: [{ card: "BT20-044", as: "blocker" }],
          security: ["BT20-001", "BT20-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("blocker")).toBeDefined();
  });
  it("publicly evolves from MegaSeadramon into the X Antibody card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-029", as: "megaSeadramon" }], hand: [{ card: "BT20-026", as: "megaX" }] },
      1: {
        battleArea: [
          { card: "BT20-023", as: "level4" },
          { card: "BT20-025", as: "level5" },
        ],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megaSeadramon").permanentId,
        instanceId: s.inst("megaX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("megaSeadramon").topCard.cardId === "BT20-026");
    expect(s.perm("megaSeadramon").stack.map((card) => card.cardId)).toContain("BT15-029");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-023")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-025")).toBe(true);
  });

  it("proves inherited attack-target lock against a public Blocker attack", async () => {
    const protectedHost = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-027", as: "host", under: ["BT20-026"] }], security: ["BT20-001"] },
        1: { battleArea: [{ card: "BT20-047", as: "blocker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      protectedHost.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: protectedHost.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => protectedHost.state.players[0]!.security.length === 0);
    expect(protectedHost.perm("blocker")).toBeDefined();

    const unprotectedHost = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-027", as: "host" }], security: ["BT20-001"] },
        1: { battleArea: [{ card: "BT20-047", as: "blocker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      unprotectedHost.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: unprotectedHost.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => unprotectedHost.perm("blocker").isSuspended);
    expect(unprotectedHost.state.players[0]!.security).toHaveLength(1);
  });

  it("prevents the selected opponent from suspending to attack until its turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-029", as: "base" }],
          hand: [{ card: "BT20-026", as: "megaX" }, "BT20-010"],
          deck: ["BT20-010", "BT20-010", "BT20-010"],
          security: ["BT20-001"],
        },
        1: { battleArea: [{ card: "BT20-025", as: "restricted" }], hand: ["BT20-010"], deck: ["BT20-010", "BT20-010"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("megaX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-026");
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const attack = {
      type: "attack" as const,
      attackerPermanentId: s.perm("restricted").permanentId,
      target: { kind: "player" as const },
    };
    expect(s.engine.applyIntent(1, attack)).toMatchObject({ ok: false });
    expect(s.perm("restricted").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, attack)).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "securityChecked" }));
    expect(s.perm("restricted").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });
});
