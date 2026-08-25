import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT23-102.js";
import "../index.js";

describe("BT23-102 Mastemon", () => {
  it("matches every catalog field, keyword, and complete compiled clause", () => {
    expect(getCardDefinition("BT23-102")).toMatchObject({
      cardId: "BT23-102",
      nameEn: "Mastemon",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Angel", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.flatMap((effect) => effect.keywords ?? []).map((keyword) => keyword.keyword)).toEqual([
      "Barrier",
      "Partition",
    ]);
  });

  it("trashes both security stacks down to three with the same-level condition", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      bothPlayers: true,
      leaveCount: 3,
      condition: { kind: "selfDigivolutionStackHasSameLevelPair" },
    });
  });

  it("allows either player's Digimon as the bottom-security placement source", () => {
    const trigger = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(trigger.actions[0].actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "addBottom",
      controller: "any",
      source: { filter: { isDigimon: true, controller: "any" } },
    });
  });

  it("plays a qualifying level 5 yellow card for free, then trims both security stacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-102", as: "mastemon", under: ["BT23-102"] }],
          hand: [{ card: "BT23-031", as: "qualifying" }],
          security: 5,
        },
        1: { security: 4 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const qualifyingId = s.inst("qualifying").instanceId;

    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mastemon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === qualifyingId));

    // The conditional tail trims both stacks exactly to three. The independent test below
    // drives the resulting removal window directly and proves the optional once-per-turn placement.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === qualifyingId)).toBe(true);
  });

  it("does not play a level 6 or non-yellow/purple card and does not trim without a same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-102", as: "mastemon" }],
          hand: ["BT23-034", "BT23-046"],
          security: 5,
        },
        1: { security: 4 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mastemon"));

    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("places either player's selected Digimon at the bottom of its security and fires only once per turn", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-102", as: "mastemon" }],
          security: [{ card: "BT1-001", as: "ownTop" }],
        },
        1: { battleArea: [{ card: "BT23-067", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    const opponentId = s.perm("opponentDigimon").topCard!.instanceId;
    preferredIds.push(s.perm("opponentDigimon").permanentId);

    const firstTrigger = advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await firstTrigger;
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === opponentId));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.at(-1)!.instanceId).toBe(opponentId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});
