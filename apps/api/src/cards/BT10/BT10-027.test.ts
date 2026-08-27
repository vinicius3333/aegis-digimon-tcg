import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-027.js";
describe("BT10-027 Regalecusmon", () => {
  it("encodes bottom-two source trash and one mandatory level 3 plus one mandatory level 4 play", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [expect.objectContaining({ kind: "TrashDigivolution", amount: 2, fromTop: false })],
      }),
      expect.objectContaining({
        trigger: "WhenAttacking",
        optional: true,
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            target: expect.objectContaining({ filter: expect.objectContaining({ level: 3 }) }),
          }),
          expect.objectContaining({
            kind: "PlayWithoutCost",
            target: expect.objectContaining({ filter: expect.objectContaining({ level: 4 }) }),
          }),
        ],
      }),
    ]);
  });

  it("trashes 2 bottom digivolution cards of an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT10-027", as: "evolving" }] },
        1: {
          battleArea: [
            {
              card: "BT2-047",
              as: "target",
              under: [
                { card: "BT1-001", as: "bottom" },
                { card: "BT1-002", as: "middle" },
                { card: "BT1-003", as: "top" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack[0]?.instanceId).toBe(s.inst("top").instanceId);
  });

  it("plays both a level 3 and level 4 source when attacking a board with a source-less Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-027",
              as: "regalecusmon",
              under: [
                { card: "BT9-021", as: "level3" },
                { card: "BT9-025", as: "level4" },
                { card: "BT10-023", as: "level5" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "sourceLess", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("regalecusmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("sourceLess").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("level4").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("level3").instanceId),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("level4").instanceId),
    ).toBe(true);
    expect(s.perm("regalecusmon").stack.map((card) => card.instanceId)).toEqual([s.inst("level5").instanceId]);

    const ownDecisions = s.decisions.map(({ req }) => req).filter((request) => request.sourceCardId === "BT10-027");
    expect(ownDecisions.map((request) => request.kind)).toEqual(["optional", "selectCards", "selectCards"]);
    const selections = ownDecisions.filter((request) => request.kind === "selectCards");
    expect(selections).toHaveLength(2);
    expect(selections.every((request) => request.options?.min === 1 && request.options.max === 1)).toBe(true);
  });

  it("does not offer the attack effect unless an opposing Digimon has no sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-027",
              as: "regalecusmon",
              under: [
                { card: "BT9-021", as: "level3" },
                { card: "BT9-025", as: "level4" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-010",
              as: "withSource",
              under: ["BT1-001"],
              suspended: true,
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("regalecusmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("withSource").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("regalecusmon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("level3").instanceId,
      s.inst("level4").instanceId,
    ]);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "BT10-027")).toBe(false);
  });

  it("plays the sole available level when only a level 3 source exists (Q1951)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-027", as: "regalecusmon", under: [{ card: "BT9-021", as: "level3" }] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "sourceLess" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("regalecusmon"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("level3").instanceId),
    ).toBe(true);
    expect(s.perm("regalecusmon").stack).toHaveLength(0);
  });
});
