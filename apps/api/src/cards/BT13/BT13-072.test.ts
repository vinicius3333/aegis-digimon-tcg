import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-072.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";

describe("BT13-072 DoruGreymon", () => {
  it("places an X Antibody reveal under itself and grants conditional DP immunity", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["X Antibody"] }] },
              count: 1,
              to: "placeUnder",
            },
          ],
          rest: "trash",
        },
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "dpImmune",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["X Antibody"] }],
            },
            count: 1,
            from: ["hand"],
          },
          optional: true,
        },
      ],
    });
  });

  it("loads the compiled DoruGreymon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-072", as: "doru" }] } });
    await s.ready();
    expect(s.perm("doru").topCard?.cardId).toBe("BT13-072");
  });

  it("places one revealed X Antibody card under itself and applies DP immunity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-066", as: "base" }],
          hand: [{ card: "BT13-072", as: "doru" }],
          // The mandatory digivolution draw consumes the first card before
          // [When Digivolving] reveals the next three.
          deck: ["BT1-009", "BT9-055", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("doru").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT13-072" && s.perm("base").stack.some((card) => card.cardId === "BT9-055"),
    );

    expect(s.perm("base").topCard?.cardId).toBe("BT13-072");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT9-055");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(observe(s.engine).isRestricted(s.perm("base"), "dpImmune")).toBe(true);
  });

  it("places an X Antibody Digimon from hand under the inherited host at turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT13-072"] }], hand: ["BT9-055"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("host"));

    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT9-055");
  });
});
