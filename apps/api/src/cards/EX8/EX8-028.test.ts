import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-028.js";

describe("EX8-028", () => {
  it("has Ice Clad and Barrier and plays an Ice-Snow Digimon from hand when digivolving", () => {
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "IceClad", raw: "＜Ice Clad＞" },
        { keyword: "Barrier", raw: "＜Barrier＞" },
      ]),
    );
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "CostModifier", mode: "raiseCeiling", costType: "level" });
    expect(actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { count: 1 },
    });
  });
  it("has once-per-turn self-unsuspend effects when digivolving and attacking", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving" && entry.frequency === "OncePerTurn")
        ?.actions[0],
    ).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      cost: { kind: "place", destination: "security", position: "bottom" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend" }],
    });
  });

  it("exposes Ice Clad and Barrier on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-028", as: "skadimon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("skadimon"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skadimon"), "Barrier")).toBe(true);
  });

  it("raises the level ceiling per source-less opponent and plays a level 5 Ice-Snow card", async () => {
    expect(digivolutionRequirementsFor("EX8-028")).toContainEqual({
      level: 5,
      traits: ["Ice-Snow"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-023", as: "polar" }],
          hand: [
            { card: "EX8-028", as: "skadimon" },
            { card: "EX8-023", as: "level5" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "bare" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("polar").permanentId,
        instanceId: s.inst("skadimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("level5").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });

  it.each([["own", 0] as const, ["opponent", 1] as const])(
    "may place an %s source-less Digimon as bottom security and unsuspend (Q3897)",
    async (alias, seat) => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX8-028", as: "skadimon", suspended: true },
              { card: "EX8-017", as: "own" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      preferInstanceIds.push(s.perm(alias).permanentId);
      const cardId = s.perm(alias).topCard.instanceId;

      await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("skadimon"));

      expect(s.perm("skadimon").isSuspended).toBe(false);
      expect(s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard.instanceId === cardId)).toBe(
        false,
      );
      expect(s.state.players[seat]!.security.some((card) => card.instanceId === cardId)).toBe(true);
      expect(s.state.players[seat]!.security.at(-1)!.instanceId).toBe(cardId);
    },
  );
});
