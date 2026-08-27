import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT5-063.js";

describe("BT5-063 Kurisarimon", () => {
  it("uses exact-name matching for both Arata Sanada references", () => {
    const whenDigivolving = compiled.effects?.find((effect) => effect.trigger === "WhenDigivolving");
    const play = whenDigivolving?.actions[0];
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { nameOrTrait: [{ tokens: ["Arata Sanada"], match: "nameExact" }] } },
      condition: { filter: { nameOrTrait: [{ tokens: ["Arata Sanada"], match: "nameExact" }] } },
    });
  });

  it("plays Arata Sanada without cost when none is in play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-058", as: "base" }],
          hand: [
            { card: "BT5-063", as: "evolving" },
            { card: "BT1-009", as: "nonArata" },
            { card: "BT5-090", as: "arata" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("nonArata").instanceId);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT5-063"));

    expect(player.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("arata").instanceId)).toBe(
      true,
    );
    expect(player.hand.some((card) => card.instanceId === s.inst("nonArata").instanceId)).toBe(true);
  });

  it("does not play another Arata Sanada when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-058", as: "base" },
            { card: "BT5-090", as: "existing" },
          ],
          hand: [
            { card: "BT5-063", as: "evolving" },
            { card: "BT5-090", as: "extra" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT5-063");
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT5-090")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("extra").instanceId)).toBe(true);
  });

  it("may decline playing Arata Sanada", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-058", as: "base" }],
          hand: [
            { card: "BT5-063", as: "evolving" },
            { card: "BT5-090", as: "arata" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT5-063");
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT5-090")).toHaveLength(
      0,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("arata").instanceId)).toBe(true);
  });

  it("grants Rush only on your turn, and loses it when the recipient changes name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-084", as: "host", under: ["BT5-063", "BT5-067"] },
          { card: "BT5-084", as: "sameName" },
          { card: "BT5-066", as: "differentName" },
        ],
        // BT18-102 is a legal white Lv.7 evolution from BT5-084 and has no
        // intrinsic Rush, so the post-evolution assertion isolates the inherited grant.
        hand: [{ card: "BT18-102", as: "renamed" }],
      },
    });

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("sameName"), "Rush")).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("sameName"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("differentName"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Rush")).toBe(false);

    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sameName").permanentId,
        instanceId: s.inst("renamed").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sameName").topCard?.cardId === "BT18-102");
    expect(observe(s.engine).hasKeyword(s.perm("sameName"), "Rush")).toBe(false);
  });
});
