import { EffectTiming, type AttackTarget } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-111.js";

describe("BT1-111 Giga Blaster", () => {
  it("suspends exactly two 5000-DP-or-less Digimon through its second mode", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-111", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-015", as: "second" },
            { card: "BT1-016", as: "tooLarge", dp: 7000 },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });

  it("activates either Main mode from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-111", as: "securityOption", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-015", as: "second" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
  });

  it("activates the Security mode through a public attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-111", as: "securityOption" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-015", as: "second" },
            { card: "BT1-009", as: "attacker", dp: 20000 },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" } satisfies AttackTarget,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && s.perm("first").isSuspended, 600);

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(
      true,
    );
  });

  it("Q982 chooses only one mode and the first mode suspends exactly 1 Digimon regardless of DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-111", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-015", as: "second" },
            { card: "BT1-016", as: "large", dp: 9000 },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.isSuspended));

    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
  });

  it("Q983 falls back to the 1-Digimon mode when fewer than two low-DP targets exist", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-111", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "onlyLow" },
            { card: "BT1-016", as: "large", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.isSuspended));

    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT1-111" && req.kind === "chooseOption")).toHaveLength(
      0,
    );
  });

  it("does not count a breeding-area Digimon when deciding whether the two-target mode is available", async () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "ConditionalBranch",
      condition: { filter: { zone: "battleArea" } },
    });
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-111", as: "option" }] },
        1: {
          breeding: { card: "BT1-010", as: "breedingLow" },
          battleArea: [{ card: "BT1-015", as: "battleLow" }],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("battleLow").isSuspended);

    expect(s.perm("battleLow").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT1-111" && req.kind === "chooseOption")).toHaveLength(
      0,
    );
  });
});
