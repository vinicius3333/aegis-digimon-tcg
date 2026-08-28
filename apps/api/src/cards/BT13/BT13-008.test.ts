import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-008.js";

describe("BT13-008 Agumon", () => {
  it("keeps the bracketed Marcus Damon reference exact", () => {
    const target = compiled.effects[0]!.actions[0] as unknown as {
      target: { filter: { nameOrTrait: [{ tokens: string[]; match: string }] } };
    };
    const reference = target.target.filter.nameOrTrait[0]!;

    expect(reference).toEqual({ tokens: ["Marcus Damon"], match: "nameExact" });
    expect(matchNameOrTrait(definitionOf("BT12-092"), reference as never)).toBe(true);
    expect(matchNameOrTrait(definitionOf("AD1-021"), reference as never)).toBe(false);
  });

  it("digivolves from Koromon for 0 memory through its alternate requirement", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-005", as: "koromon" }], hand: [{ card: "BT13-008", as: "agumon" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koromon").permanentId,
        instanceId: s.inst("agumon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koromon").topCard.cardId === "BT13-008");
    expect(s.state.memory).toBe(3);
  });

  it("makes one Marcus Damon a 3000 DP Digimon that cannot digivolve for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("agumon")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 3000);
    await settle();

    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("once per turn may delete only an opposing Digimon with 3000 DP or less when a red or yellow Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "host", under: ["BT13-008"] },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-012", as: "smallA" },
            { card: "BT1-012", as: "smallB" },
            { card: "BT1-015", as: "large" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("large").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(
      1,
    );

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(
      1,
    );
  });

  it("does not delete when the inherited optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "host", under: ["BT13-008"] },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not trigger when a Tamer outside the red-or-yellow color boundary suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-015", as: "host", under: ["BT13-008"] },
            { card: "BT13-097", as: "blueTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-012", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("blueTamer").permanentId,
    });

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });
});
