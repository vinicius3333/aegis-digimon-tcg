import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-023.js";

describe("BT22-023 AeroVeedramon", () => {
  it("returns level-4-or-lower opponent Digimon, unsuspends a blue ally, and has the Veedramon inherited reaction", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
      });
    }
    const endTurn = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(endTurn?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"], colors: ["Blue"] }, count: 1 },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
      condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] } },
      actions: [{ kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
  });

  it("returns exactly one opposing level 4 to the deck bottom while leaving level 5 intact", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-023", as: "aero" }] },
        1: {
          battleArea: [
            { card: "BT22-022", as: "level4" },
            { card: "BT22-023", as: "level5" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("aero"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("level5").permanentId,
    ]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT22-022");
  });

  it("uses its CS evolution route and resolves the same bottom-deck effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-022", as: "veedramon" }],
          hand: [{ card: "BT22-023", as: "aero" }],
        },
        1: { battleArea: [{ card: "BT22-022", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veedramon").permanentId,
        instanceId: s.inst("aero").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veedramon").topCard?.cardId === "BT22-023");

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT22-022");
  });

  it("optionally unsuspends only a blue Digimon or Tamer at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-023", as: "aero", suspended: true },
            { card: "BT1-010", as: "red", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("aero"));

    expect(s.perm("aero").isSuspended).toBe(false);
    expect(s.perm("red").isSuspended).toBe(true);
  });

  it("unsuspends a Veedramon inherited host with a blue Tamer only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", under: ["BT22-023"], as: "host", suspended: true },
            { card: "BT22-085", as: "rina" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").isSuspended).toBe(false);

    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not unsuspend the inherited host without a blue Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-022", under: ["BT22-023"], as: "host", suspended: true }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").isSuspended).toBe(true);
  });
});
