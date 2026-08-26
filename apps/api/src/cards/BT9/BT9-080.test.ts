import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-080.js";
import "./BT9-080.js";

describe("BT9-080 Raguelmon", () => {
  it("matches catalog values and both security-dependent trash-play branches", () => {
    expect(getCardDefinition("BT9-080")).toMatchObject({
      colors: ["Purple", "Yellow"], level: 6, playCost: 12, dp: 12000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 4 }, { color: "Yellow", level: 5, memoryCost: 4 }],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [],
      effects: [
        { trigger: "OnPlay", actions: [
          { kind: "PlayWithoutCost", from: ["trash"], payCost: false, condition: { kind: "zoneCount", zone: "security", op: "gte", value: 2 } },
          {
            kind: "Modal", condition: { kind: "zoneCount", zone: "security", op: "lte", value: 1 },
            options: [
              [{ kind: "PlayWithoutCost", from: ["trash"] }],
              [{
                kind: "PlayWithoutCost", from: ["trash"],
                target: { filter: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ tokens: ["Angel", "Fallen Angel"], match: "trait" }] } },
              }],
            ],
          },
        ] },
        { trigger: "EndOfYourTurn", actions: [{ kind: "DnaDigivolve", optional: true, payCost: true, materials: [{ filter: { isSelfRef: true } }, { filter: { excludeSelf: true } }] }] },
      ],
    });
  });

  it("with one security, may play an Angel level 6 from trash instead of the normal target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-080", as: "source" }],
          security: ["BT9-072"],
          trash: [
            { card: "BT9-082", as: "angel" },
            { card: "BT9-073", as: "normal" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoOrderTriggers: true,
      },
    );
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("angel").instanceId);
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((p) => p.topCard?.instanceId === s.inst("angel").instanceId));
    expect(player.battleArea.some((p) => p.topCard?.instanceId === s.inst("normal").instanceId)).toBe(false);
  });

  it("with two security, plays only the normal 6000-DP-or-less target from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-080", as: "source" }],
          security: ["BT9-072", "BT9-073"],
          trash: [
            { card: "BT9-073", as: "normal" },
            { card: "BT9-082", as: "angel" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("normal").instanceId);
    s.state.memory = 12;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("normal").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("angel").instanceId),
    ).toBe(false);
  });

  it("DNA digivolves with one other Digimon at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-080", as: "raguel" },
            { card: "AD1-016", as: "yellow" },
          ],
          hand: [{ card: "BT9-082", as: "ordinemon" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
      },
    );
    const materialIds = new Set([s.perm("raguel").permanentId, s.perm("yellow").permanentId]);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("raguel"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
      ),
    );

    const result = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("ordinemon").instanceId,
    );
    expect(result).toBeDefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => materialIds.has(permanent.permanentId))).toBe(false);
  });

  it("does not consume two materials for a normal level 7 evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-080", as: "raguel" },
            { card: "AD1-016", as: "yellow" },
          ],
          hand: [{ card: "BT9-112", as: "normalLevel7" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("raguel"));

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalLevel7").instanceId)).toBe(true);
  });
});
