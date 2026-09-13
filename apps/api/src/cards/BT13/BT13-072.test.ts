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

  it("publicly evolves into a legal Lv.6 and places one source at each own end step", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-072", as: "host" }],
          hand: [
            { card: "BT2-064", as: "evolution" },
            { card: "BT9-055", as: "firstSource" },
            { card: "BT9-055", as: "secondSource" },
          ],
          deck: [
            { card: "BT1-010", as: "bonusDraw" },
            { card: "BT1-011", as: "revealTrashOne" },
            { card: "BT9-055", as: "revealedSource" },
            { card: "BT1-012", as: "revealTrashTwo" },
            "BT1-010",
            "BT1-010",
          ],
        },
        1: { hand: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const initialOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const sourceId = s.inst("host").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("evolution").instanceId);
    await settle();

    expect(s.state.memory).toBe(8);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("firstSource").instanceId,
        s.inst("secondSource").instanceId,
        s.inst("bonusDraw").instanceId,
      ]),
    );

    advance(s.engine).endMainPhaseIfOpen(0);
    await initialOwnTurn;
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("firstSource").instanceId);
    expect(s.perm("host").stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondSource").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").stack).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondSource").instanceId);

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;

    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("secondSource").instanceId);
    expect(s.perm("host").stack).toHaveLength(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("firstSource").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondSource").instanceId);
  });
});
