import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-089.js";
import "./BT4-111.js";
import "./BT4-112.js";

describe("BT4 Plutomon option-control deck gauntlet", () => {
  it("draws, uses Hell's Gate for free, and sends only a level 6 target to trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-083", as: "levelFiveBase" }],
          hand: [
            { card: "BT4-089", as: "plutomon" },
            { card: "BT4-112", as: "hellsGate" },
            { card: "BT4-111", as: "jackRaid" },
          ],
          deck: ["BT4-071", "BT4-072", "BT4-073", "BT4-074"],
        },
        1: {
          battleArea: [
            { card: "BT4-087", as: "levelSixTarget" },
            { card: "BT4-087", as: "secondLevelSix" },
            { card: "BT4-083", as: "levelFiveControl" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("hellsGate").instanceId, s.perm("levelSixTarget").permanentId);
    const targetId = s.perm("levelSixTarget").permanentId;
    const controlId = s.perm("levelFiveControl").permanentId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("levelFiveBase").permanentId,
        instanceId: s.inst("plutomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("hellsGate").instanceId) &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId) &&
      s.state.pendingDecision === undefined
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT4-087")).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === controlId)).toBe(true);

    const optionRequest = s.decisions.find(({ req }) => {
      if (req.kind !== "selectCards") return false;
      return (req.options?.candidateInstanceIds ?? []).includes(s.inst("hellsGate").instanceId);
    })?.req;
    expect(optionRequest).toBeDefined();
    expect(new Set(optionRequest!.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([s.inst("hellsGate").instanceId, s.inst("jackRaid").instanceId]),
    );

    const targetRequest = s.decisions.find(({ req }) => {
      if (req.kind !== "chooseTargets") return false;
      return (req.options?.candidateInstanceIds ?? []).includes(targetId);
    })?.req;
    expect(targetRequest).toBeDefined();
    expect(targetRequest!.options?.candidateInstanceIds).toContain(targetId);
    expect(targetRequest!.options?.candidateInstanceIds).toContain(s.perm("secondLevelSix").permanentId);
    expect(targetRequest!.options?.candidateInstanceIds).not.toContain(controlId);
    assertNoLoudGap(s);
  });
});
