import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-023.js";

describe("EX6-023 Gokuumon", () => {
  it("shares a once-per-turn DigiXros effect that grants Security Attack -1 and deletes a 6000 DP or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        optional: true,
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
      },
      {
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 6000 } } },
        condition: { kind: "digiXrosCount", minimum: 1 },
      },
    ]);
  });
  it("permits exactly one listed DigiXros material", () =>
    expect(compiled.digiXrosRequirement).toMatchObject([{ count: 2, maxMaterials: 1 }]));
  it("returns a yellow Digimon source from its own stack when it would leave play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { colors: ["Yellow"], zone: "digivolutionCards", hostFilter: { isSelfRef: true } } },
        },
      ],
    }));
  it("publicly applies Security Attack -1 to an opposing Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-023", as: "goku" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("goku"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("goku"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("publicly executes the DigiXros-only delete tail with one listed material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-023", as: "goku" },
            { card: "EX6-025", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent", dp: 6000 },
            { card: "BT1-009", as: "overLimit", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("goku").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("overLimit").instanceId);
    expect(s.perm("goku").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });

  it("publicly returns its yellow evolution card when leaving play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-023", as: "goku", under: ["EX6-019"] }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("goku").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("goku").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX6-019")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("publicly grants Security Attack -1 to your other Digimon when selected", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-023", as: "goku" },
            { card: "BT1-009", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("ally").instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("goku"));
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(-1);
  });

  it("publicly returns its source after a real DigiXros host leaves play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-023", as: "goku" },
            { card: "EX6-025", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("goku").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("goku").instanceId),
    );
    await advance(s.engine).verb.deletePermanent([s.state.players[0]!.battleArea[0]!.permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});
