import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { type PermanentSpec, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-022.js";
import "../BT10/BT10-084.js";

describe("BT8-022 SnowAgumon", () => {
  it("trashes the top digivolution card of an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT8-022", as: "source" }] },
        1: { battleArea: [{ card: "BT8-030", as: "target", under: ["BT8-021", { card: "BT8-023", as: "stackTop" }] }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);
    expect(opponent.trash.some((c) => c.instanceId === s.inst("stackTop").instanceId)).toBe(true);
  });

  it("can choose a source-free Digimon before Tactimon redirects the trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT8-022", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT8-034", as: "sourceFree" },
            {
              card: "BT10-084",
              as: "tactimon",
              under: [
                { card: "BT10-071", as: "tactimonTopSource" },
                { card: "BT10-073", as: "tactimonBottomSource" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sourceFree").permanentId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tactimon").stack.length === 1);

    expect(s.perm("sourceFree").stack).toHaveLength(0);
    expect(s.perm("tactimon").stack).toHaveLength(1);
    expect(
      s.state.players[1]!.trash.some(
        (card) =>
          card.instanceId === s.inst("tactimonTopSource").instanceId ||
          card.instanceId === s.inst("tactimonBottomSource").instanceId,
      ),
    ).toBe(true);
  });
});

describe("BT8-022 SnowAgumon — KB Q&A rulings", () => {
  const playSnowAgumonChoosingSourceFree = async (opponentBattleArea: PermanentSpec[]) => {
    const s = setupEngine({
      0: { hand: [{ card: "BT8-022", as: "source" }] },
      1: { battleArea: opponentBattleArea },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const choice = s.state.pendingDecision!;
    expect(choice.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("sourceFree").permanentId] },
      }),
    ).toEqual({ ok: true });
    return s;
  };

  it("lets Tactimon replace the trash aimed at a Digimon with no digivolution cards (Q2007)", async () => {
    const control = await playSnowAgumonChoosingSourceFree([
      { card: "BT8-034", as: "sourceFree" },
      { card: "BT8-030", as: "bystander", under: ["BT8-021"] },
    ]);
    await settle();
    expect(control.state.pendingDecision).toBeUndefined();
    expect(control.state.players[1]!.trash).toHaveLength(0);
    expect(control.perm("bystander").stack).toHaveLength(1);

    const s = await playSnowAgumonChoosingSourceFree([
      { card: "BT8-034", as: "sourceFree" },
      {
        card: "BT10-084",
        as: "tactimon",
        under: [
          { card: "BT10-071", as: "tactimonBottomSource" },
          { card: "BT10-073", as: "tactimonTopSource" },
        ],
      },
    ]);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const replacement = s.state.pendingDecision!;
    expect(replacement.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: replacement.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length > 0);

    expect(s.perm("sourceFree").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("tactimonTopSource").instanceId);
    expect(s.perm("tactimon").stack.map((card) => card.instanceId)).toEqual([
      s.inst("tactimonBottomSource").instanceId,
    ]);
  });
});
