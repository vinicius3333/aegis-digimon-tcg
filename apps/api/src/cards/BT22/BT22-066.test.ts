import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-066.js";

describe("BT22-066 Raidenmon", () => {
  it("may unsuspend or suspend any Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Unsuspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Suspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("De-Digivolves an opposing Digimon when an own Ver.5 Digimon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] },
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("suspends itself on play and De-Digivolves through the resulting Ver.5 suspension", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT22-066", as: "raidenmon" }] },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT22-068"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const target = s.perm("target");
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidenmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.topCard?.cardId === "BT22-068");

    expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
    expect(target.topCard?.cardId).toBe("BT22-068");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-071")).toBe(true);
  });
});

describe("BT22-066 Raidenmon — KB Q&A rulings", () => {
  it("can unsuspend and suspend either its controller's or the opponent's Digimon (Q4924)", async () => {
    async function playRaidenmon(picks: { unsuspend: string; suspend: string }) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT22-066", as: "raidenmon" }],
            battleArea: [
              { card: "BT1-009", as: "mineRested", suspended: true },
              { card: "BT1-009", as: "mineReady" },
            ],
          },
          1: {
            battleArea: [
              { card: "BT1-010", as: "theirsRested", suspended: true },
              { card: "BT1-010", as: "theirsReady" },
            ],
          },
        },
        { autoAcceptOptional: true, declineDigiXros: true },
      );
      s.state.memory = 7;
      const answered = new Set<string>();
      const nextTargetChoice = () =>
        s.decisions.find(({ req }) => req.kind === "chooseTargets" && !answered.has(req.decisionId));

      async function chooseTarget(alias: string): Promise<void> {
        await settle(() => nextTargetChoice() !== undefined);
        const { seat, req } = nextTargetChoice()!;
        answered.add(req.decisionId);
        const permanent = s.perm(alias);
        const pick = (req.options?.candidateInstanceIds ?? []).find(
          (id) => id === permanent.permanentId || id === permanent.topCard?.instanceId,
        );
        expect(seat).toBe(0);
        expect(pick).toBeDefined();
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "chooseTargets", instanceIds: [pick!] },
          }),
        ).toEqual({ ok: true });
      }

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidenmon").instanceId })).toEqual({
        ok: true,
      });
      await chooseTarget(picks.unsuspend);
      await chooseTarget(picks.suspend);
      await settle();
      return s;
    }

    const opponentUnsuspended = await playRaidenmon({ unsuspend: "theirsRested", suspend: "mineReady" });
    expect(opponentUnsuspended.perm("theirsRested").isSuspended).toBe(false);
    expect(opponentUnsuspended.perm("mineRested").isSuspended).toBe(true);
    expect(opponentUnsuspended.perm("mineReady").isSuspended).toBe(true);
    expect(opponentUnsuspended.perm("theirsReady").isSuspended).toBe(false);

    const ownUnsuspended = await playRaidenmon({ unsuspend: "mineRested", suspend: "theirsReady" });
    expect(ownUnsuspended.perm("mineRested").isSuspended).toBe(false);
    expect(ownUnsuspended.perm("theirsRested").isSuspended).toBe(true);
    expect(ownUnsuspended.perm("theirsReady").isSuspended).toBe(true);
    expect(ownUnsuspended.perm("mineReady").isSuspended).toBe(false);
  });
});
