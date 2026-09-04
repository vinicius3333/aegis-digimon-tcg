import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-013.js";
import "../index.js";

describe("EX5-013 Zhuqiaomon", () => {
  it("supports Blast Digivolve and shared once-per-turn deletion for Security Attack plus one", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toMatchObject([
      { keyword: "BlastDigivolve" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      cost: {
        kind: "deleteOwn",
        target: {
          filter: {
            or: [{ nameOrTrait: [{ match: "trait", tokens: ["Deva"] }] }, { dp: { op: "lte", value: 6000 } }],
          },
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [{ kind: "GainKeyword", duration: "forTheTurn", keyword: { keyword: "SecurityAttack", amount: 1 } }],
    });
  });
  it("deletes the highest-DP opposing Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestDP" } },
    });
  });

  it("deletes an opposing Deva and gains Security Attack plus one when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX5-013", as: "zhuqiaomon" }] },
        1: { battleArea: [{ card: "EX5-009", as: "deva" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("deva").permanentId);
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zhuqiaomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "EX5-013" &&
        s.state.players[1]!.trash.some((card) => card.cardId === "EX5-009"),
      500,
    );
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX5-009")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
  });

  it("does not gain Security Attack when no Deva or low-DP Digimon can be deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX5-013", as: "zhuqiaomon" }] },
        1: { battleArea: [{ card: "EX5-013", as: "high" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zhuqiaomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-013", 500);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-013")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(0);
  });
});
