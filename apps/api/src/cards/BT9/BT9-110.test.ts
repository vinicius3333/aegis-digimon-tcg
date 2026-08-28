import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-110.js";
import "./BT9-110.js";

describe("BT9-110 X Program", () => {
  it("matches catalog values and global-count branch, waiver, and security IR", () => {
    expect(getCardDefinition("BT9-110")).toMatchObject({
      colors: ["White"], kinds: ["Option"], playCost: 8,
      securityEffectText: "[Security] Delete 1 of your opponent's Digimon without [X Antibody] in its traits.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] },
        {
          trigger: "Main",
          actions: [{
            kind: "ConditionalBranch", condition: { kind: "totalDigimonCount", value: 3 },
            ifTrue: [{ kind: "Delete", target: { count: "all", filter: { excludeNameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } } }],
            ifFalse: [{ kind: "Delete", target: { count: 1 } }],
          }],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", excludeNameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } } }] },
      ],
    });
  });

  it("deletes exactly 1 non-X-Antibody Digimon while fewer than 3 are in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-075", as: "protectedDex" }],
          hand: [{ card: "BT9-110", as: "option" }],
        },
        1: { battleArea: [{ card: "BT9-073", as: "deleteTarget" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("protectedDex").topCard.cardId).toBe("BT9-075");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT9-073")).toBe(true);
  });

  it("deletes every non-X-Antibody Digimon on both sides when 3 or more are in play (Q1924/Q1925)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-075", as: "ownProtected" },
            { card: "BT9-073", as: "ownDeleted" },
          ],
          hand: [{ card: "BT9-110", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT9-071", as: "opponentDeleted" },
            { card: "BT9-070", as: "opponentProtected" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT9-075");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT9-070");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT9-073")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT9-071")).toBe(true);
  });

  it("[Security] deletes only an opponent's non-X-Antibody Digimon", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT9-110", as: "securityOption", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT9-071", as: "deleteTarget" },
            { card: "BT9-070", as: "protected" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("protected").topCard.cardId).toBe("BT9-070");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT9-071")).toBe(true);
  });
});
