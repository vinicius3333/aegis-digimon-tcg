import { advance } from "../../engine/testkit/advance.js";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-044.js";
import "./index.js";
import "../BT1/BT1-036.js";

describe("BT20-044 Breakdramon", () => {
  it("suspends two opposing Digimon or Tamers and offers an attack on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 } },
          { kind: "Attack", optional: true },
        ],
      });
    }
  });

  it("deletes a suspended opposing Digimon or Tamer after a qualifying own Digimon deletes in battle", () => {
    for (const effect of compiled.effects.filter((entry) => entry.trigger === "AllTurns")) {
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { controller: "mine", kind: ["Digimon"], textContains: ["[Dracomon]", "[Examon]"] },
            fireCondition: { kind: "triggerSourceNotDeletedAtSameTiming" },
            actions: [
              {
                kind: "Delete",
                target: {
                  filter: { controllerDefault: "opponent", suspended: true, kind: ["Digimon", "Tamer"] },
                  count: 1,
                },
              },
            ],
          },
        ],
      });
    }
    expect(compiled.effects.filter((entry) => entry.isInherited)).toHaveLength(1);
  });

  it("has Blocker and suspends exactly two opposing Digimon or Tamers on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-044", as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-010", as: "first" },
            { card: "BT20-088", as: "second" },
            { card: "BT20-085", as: "third" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("breakdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);
    expect(s.perm("third").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("breakdramon"), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(-2); // play cost 12 from the legal 10-memory gauge
  });

  it("deletes a second suspended opponent after a qualifying ally wins a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon" },
            { card: "BT20-040", dp: 5000, as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "battleTarget" },
            { card: "BT20-085", suspended: true, as: "effectTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("attacker"));
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT20-085");
  });

  it("accepts the optional entry attack through public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-044", as: "breakdramon" }],
          battleArea: [{ card: "BT20-040", dp: 5000, as: "attacker" }],
          security: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "first" },
            { card: "BT20-011", as: "second" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("breakdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.memory).toBe(-2);
  });

  it("does not react when an opponent's text-matching Digimon deletes an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon" },
            { card: "BT20-010", dp: 1000, suspended: true, as: "victim" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-023", dp: 10000, as: "opponentText" },
            { card: "BT20-085", dp: 1000, suspended: true, as: "untouched" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentText").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("untouched"));
  });

  it("limits both resident and inherited deletion watchers once per turn, then resets next turn", async () => {
    for (const inherited of [false, true] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              inherited ? { card: "BT1-084", under: ["BT20-044"], as: "watcher" } : { card: "BT20-044", as: "watcher" },
              { card: "BT20-040", dp: 5000, as: "attacker" },
            ],
            hand: [{ card: "BT1-036", as: "garurumon1" }, "BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
            security: ["BT1-010", "BT1-010"],
          },
          1: {
            battleArea: [
              { card: "BT20-010", dp: 1000, suspended: true, as: "battle1" },
              { card: "BT20-011", dp: 1000, suspended: true, as: "effect1" },
              { card: "BT20-012", dp: 1000, suspended: true, as: "battle2" },
              { card: "BT20-013", dp: 3000, suspended: true, as: "effect2" },
              { card: "BT20-014", dp: 3000, suspended: true, as: "battle3" },
            ],
            hand: ["BT1-010"],
            security: ["BT1-010", "BT1-010", "BT1-010"],
            deck: ["BT1-010", "BT1-010", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      s.state.memory = 6;
      await s.ready();
      const ownTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      const effect1PermanentId = s.perm("effect1").permanentId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("battle1").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => !observe(s.engine).isAttacking() && s.state.players[1]!.trash.some((card) => card.cardId === "BT20-010"),
      );
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === effect1PermanentId)).toBe(false);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon1").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => !s.perm("attacker").isSuspended && s.state.pendingDecision === undefined);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("battle2").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => !observe(s.engine).isAttacking() && s.state.players[1]!.trash.some((card) => card.cardId === "BT20-012"),
      );
      expect(s.state.players[1]!.battleArea).toContain(s.perm("effect2"));
      advance(s.engine).endMainPhaseIfOpen(0);
      await ownTurn;
      s.state.turnSeat = 1;
      s.state.memory = -s.state.memory;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      // Publicly attack with the two surviving suspended candidates so they
      // remain suspended after the opponent's unsuspend phase.
      for (const alias of ["battle3", "effect2"] as const) {
        expect(
          s.engine.applyIntent(1, {
            type: "attack",
            attackerPermanentId: s.perm(alias).permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        if (!inherited) {
          await settle(
            () =>
              s.events.filter((event) => event.kind === "blockWindowOpened").length >= (alias === "battle3" ? 1 : 2),
          );
          expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
        }
        await settle(
          () =>
            !observe(s.engine).isAttacking() &&
            s.events.filter((event) => event.kind === "combatResolved").length >= (alias === "battle3" ? 3 : 4),
        );
        expect(observe(s.engine).isAttacking()).toBe(false);
      }
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
      s.state.turnSeat = 0;
      s.state.memory = -s.state.memory;
      const nextOwnTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("battle3").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT20-013");
      advance(s.engine).endMainPhaseIfOpen(0);
      await nextOwnTurn;
    }
  });

  it("provides the same deletion watcher from an inherited source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-045", as: "host", under: ["BT20-044"] },
            { card: "BT20-040", dp: 5000, as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "battleTarget" },
            { card: "BT20-085", suspended: true, as: "effectTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("does not react when a non-Dracomon/Examon Digimon wins a battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-044", as: "breakdramon" },
          { card: "BT20-010", dp: 5000, as: "unqualified" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT20-010", dp: 1000, suspended: true, as: "battleTarget" },
          { card: "BT20-085", dp: 1000, suspended: true, as: "effectTarget" },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("unqualified").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("effectTarget"));
    expect(s.state.players[0]!.battleArea).toContain(s.perm("unqualified"));
  });

  it("does not trigger the inherited deletion when its host and the battled Digimon die together", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-084", dp: 1000, as: "host", under: ["BT20-044"] }] },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "battleTarget" },
            { card: "BT20-085", dp: 1000, suspended: true, as: "effectTarget" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("effectTarget"));
  });

  it("reaches Breakdramon from a legal Groundramon stack through a public alternate evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-042", as: "groundramon" }], hand: [{ card: "BT20-044", as: "breakdramon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("groundramon").permanentId,
        instanceId: s.inst("breakdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("groundramon").topCard.cardId === "BT20-044");
    expect(s.perm("groundramon").stack.map((card) => card.cardId)).toEqual(["BT20-042"]);
    expect(s.state.memory).toBe(2);
  });
});
