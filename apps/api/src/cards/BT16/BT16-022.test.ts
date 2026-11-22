import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-022.js";
import "../index.js";

describe("BT16-022", () => {
  it("models Armor Purge", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("trashes digivolution cards and grants Security Attack -1", () => {
    const actions = compiled.effects?.[1]?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      choose: true,
      target: expect.objectContaining({
        count: 1,
        filter: expect.not.objectContaining({ digivolutionCards: "hasAny" }),
      }),
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
    });
  });

  it("offers every opposing Digimon to the trash, then gives Security Attack -1 to a source-less opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT16-022"] }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "stacked", under: ["BT1-009"] },
          { card: "BT1-011", as: "sourceLess" },
        ],
      },
    });
    const stackedSourceId = s.perm("stacked").stack[0]!.instanceId;
    const answer = async (kind: "chooseTargets" | "selectCards", instanceIds: string[]): Promise<string[]> => {
      await settle(() => s.state.pendingDecision?.kind === kind);
      const pending = s.state.pendingDecision!;
      const offered = s.decisions.at(-1)?.req.options?.candidateInstanceIds ?? [];
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind, instanceIds },
        }),
      ).toEqual({ ok: true });
      return [...offered];
    };

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(await answer("chooseTargets", [s.perm("stacked").permanentId])).toEqual([
      s.perm("stacked").permanentId,
      s.perm("sourceLess").permanentId,
    ]);
    await settle(() => s.perm("stacked").stack.length === 0 || s.state.pendingDecision?.kind === "selectCards");
    if (s.state.pendingDecision?.kind === "selectCards") await answer("selectCards", [stackedSourceId]);
    await settle(() => s.perm("stacked").stack.length === 0);
    await answer("chooseTargets", [s.perm("sourceLess").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === stackedSourceId)).toBe(true);
    expect(s.perm("stacked").stack).toHaveLength(0);
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("sourceLess").permanentId, "SecurityAttack")).toBe(true);
  });

  it("can trash any selected evolution card rather than defaulting to the top card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT16-022"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "stacked", under: ["BT1-009", "BT1-011"] },
            { card: "BT1-011", as: "sourceLess" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const bottomSourceId = s.perm("stacked").stack[0]!.instanceId;
    const topSourceId = s.perm("stacked").stack[1]!.instanceId;
    preferred.push(bottomSourceId, s.perm("stacked").permanentId, s.perm("sourceLess").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stacked").stack.length === 1);

    expect(s.perm("stacked").stack[0]!.instanceId).toBe(topSourceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === bottomSourceId)).toBe(true);
  });
});
