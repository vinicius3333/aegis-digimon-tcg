import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-065.js";

describe("BT15-065", () => {
  it("grants inherited Security Attack +1 during your turn", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "forTheTurn",
        },
      ],
    }));
  it("may trash a Numemon to de-digivolve an opposing Digimon to level 3 on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          amount: 1,
          stopAtLevel: 3,
          cost: {
            kind: "trash",
            target: { source: "thisDigimon", from: ["hand", "digivolutionCards"] },
          },
          optional: true,
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          amount: 1,
          stopAtLevel: 3,
          cost: {
            kind: "trash",
            target: { source: "thisDigimon", from: ["hand", "digivolutionCards"] },
          },
        },
      ],
    });
  });
  it("may place a Numemon from trash to restrict low-cost opposing attacks", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          restriction: "attackPlayers",
          target: { count: "all" },
          cost: { kind: "place" },
          optional: true,
        },
      ],
    }));

  it("uses a Numemon from hand, then places it under itself and restricts opposing low-cost attacks", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT15-065", as: "waruMonzaemon" },
            { card: "BT14-058", as: "numemon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT15-066", as: "stackedTarget", under: ["BT15-064"] },
            { card: "BT14-058", as: "lowCostTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("waruMonzaemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.perm("waruMonzaemon").stack.some(({ instanceId }) => instanceId === s.inst("numemon").instanceId),
    );

    expect(s.perm("stackedTarget").topCard?.cardId).toBe("BT15-064");
    expect(s.perm("waruMonzaemon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("numemon").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("lowCostTarget"), "attackPlayers")).toBe(true);
  });

  it("pays its digivolution effect with only its own Numemon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "sourceNumemon" },
            {
              card: "BT15-066",
              as: "competingHost",
              under: [{ card: "BT14-058", as: "competingNumemon" }],
            },
          ],
          hand: [{ card: "BT15-065", as: "waruMonzaemon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "BT15-066",
              as: "stackedTarget",
              under: ["BT15-064"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourcePermanentId = s.perm("sourceNumemon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: sourcePermanentId,
        instanceId: s.inst("waruMonzaemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stackedTarget").topCard?.cardId === "BT15-064");

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("sourceNumemon").instanceId);
    expect(s.perm("competingHost").stack.map(({ instanceId }) => instanceId)).toContain(
      s.inst("competingNumemon").instanceId,
    );
    expect(s.perm("stackedTarget").topCard?.cardId).toBe("BT15-064");
  });
});
