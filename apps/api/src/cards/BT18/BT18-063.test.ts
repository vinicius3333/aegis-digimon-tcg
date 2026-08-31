import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-063.js";
import "./index.js";

describe("BT18-063 Beetlemon", () => {
  it("prevents opponent-effect deletion after digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[2]).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          leaveCause: "otherThanYourEffect",
          actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true }],
        },
      ],
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-057", as: "base" }], hand: [{ card: "BT18-063", as: "beetlemon" }] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-063");
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "beDeleted"));

    expect(observe(s.engine).isRestricted(s.perm("base"), "beDeleted")).toBe(true);
    s.state.turnSeat = 1;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(0);
    assertNoLoudGap(s);
  });

  it("Q2993/Q2995 digivolves from J.P. for two, draws, and retains the Tamer as a digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-091", as: "jp", enteredThisTurn: true }],
        hand: [{ card: "BT18-063", as: "beetlemon" }],
        deck: ["BT1-001"],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.turnCount = 1;
    s.perm("jp").enterFieldTurnCount = 1;
    s.state.memory = 5;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard.cardId === "BT18-063");

    expect(s.state.memory).toBe(3);
    expect(s.perm("jp").stack.map(({ cardId }) => cardId)).toContain("BT18-091");
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jp").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.perm("jp").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("digivolves from MetalKabuterimon for zero", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-067", as: "metalKabuterimon" }],
        hand: [{ card: "BT18-063", as: "beetlemon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalKabuterimon").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalKabuterimon").topCard.cardId === "BT18-063");
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("when attacking evolves a friendly Digimon into a black/yellow Hybrid for one less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-063", as: "attacker" },
            { card: "BT18-059", as: "base" },
          ],
          hand: [{ card: "BT18-063", as: "destination" }],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").topCard!.instanceId, s.inst("destination").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-063");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-059");
    assertNoLoudGap(s);
  });

  it("plays only an inherited-effect Tamer from its host when an opposing effect makes it leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-078", as: "host", under: ["BT18-063", "BT18-091", "BT18-093"] },
            { card: "BT1-078", as: "other", under: ["BT18-088"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-091"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-091")).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-093")).toBe(false);
    expect(s.perm("other").stack.map(({ cardId }) => cardId)).toEqual(["BT18-088"]);

    const ownEffect = setupEngine(
      { 0: { battleArea: [{ card: "BT1-078", as: "host", under: ["BT18-063", "BT18-091"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await ownEffect.ready();
    expect(await advance(ownEffect.engine).verb.deletePermanent([ownEffect.perm("host").permanentId], "byEffect")).toBe(
      1,
    );
    expect(ownEffect.state.players[0]!.battleArea).toHaveLength(0);
    expect(ownEffect.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-078", "BT18-063", "BT18-091"]),
    );
    assertNoLoudGap(s);
    assertNoLoudGap(ownEffect);
  });
});
