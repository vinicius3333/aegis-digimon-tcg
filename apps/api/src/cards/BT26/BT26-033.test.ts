import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-033.js";
import "../index.js";
import "../BT25/BT25-044.js";

const CARD_ID = "BT26-033";

describe("BT26-033 compiled fidelity", () => {
  it("encodes keywords, security recovery, leave prevention, and the explicit turn seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(
      expect.arrayContaining(["Raid", "Alliance", "Engage"]),
    );
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand" },
      {
        kind: "Modal",
        condition: { kind: "isYourTurn" },
        options: [[{ kind: "PlayWithoutCost", reduceCostBy: 5 }], [{ kind: "UseOptionWithoutCost", reduceCostBy: 5 }]],
      },
    ]);
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          mode: "prevent",
          affectsAll: true,
          target: { count: "all", filter: { kind: ["Digimon", "Tamer"] } },
          cost: { kind: "placeAsSecurity", position: "bottom", target: { filter: { isSelfRef: true }, isSelf: true } },
        },
      ],
    });
    expect(card?.effects?.slice(2)).toMatchObject([
      {
        trigger: "Static",
        actions: [{ kind: "CostModifier", costType: "use", amount: 1, handResident: true }],
      },
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] },
      {
        trigger: "Main",
        actions: [
          { kind: "Delete", target: { count: "all", filter: { superlative: "lowestDP" } } },
          { kind: "Recover", amount: 1 },
        ],
      },
    ]);
  });

  it("adds top security to hand and stacks Junomon's self-reducer with its own reduction (Q7004)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-033", as: "jupitermon", under: [{ card: "BT26-029", as: "tsBase" }] }],
          security: [{ card: "BT1-001", as: "securityCard" }],
          hand: [{ card: "BT25-044", as: "junomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jupitermon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT25-044");
  });

  it("digivolves from a legal level-5 TS stack and resolves the mandatory security move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "tsBase" }],
          hand: [{ card: CARD_ID, as: "jupitermon" }],
          security: [{ card: "BT1-001", as: "securityTop" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("jupitermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect([...s.perm("tsBase").stack, s.perm("tsBase").topCard].map(({ cardId }) => cardId)).toEqual([
      "BT26-015",
      CARD_ID,
    ]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not offer the Iliad play/use continuation on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "jupitermon" }],
          hand: [{ card: "BT26-015", as: "iliad" }],
          security: [{ card: "BT1-001", as: "securityTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jupitermon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-015");
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("may decline the optional Iliad continuation after taking security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "jupitermon" }],
          hand: [{ card: "BT26-015", as: "iliad" }],
          security: [{ card: "BT1-001", as: "securityTop" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("jupitermon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-015");
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("pays once to prevent every simultaneous TS departure (Q7005)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-033", as: "jupitermon", under: [{ card: "BT26-030", as: "base" }] },
            { card: "BT26-013", as: "firstProtected" },
            { card: "BT26-030", as: "secondProtected" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("firstProtected").permanentId, s.perm("secondProtected").permanentId],
        "byEffect",
      ),
    ).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-013")).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-030")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT26-033");
  });

  it("protects only owned TS cards and leaves non-TS or opponent TS cards", async () => {
    const protectedCase = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "jupitermon", under: [{ card: "BT26-030", as: "base" }] },
            { card: "BT26-015", as: "ownedTs" },
          ],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await protectedCase.ready();
    expect(
      await advance(protectedCase.engine).verb.deletePermanent([protectedCase.perm("ownedTs").permanentId], "byEffect"),
    ).toBe(0);
    expect(protectedCase.perm("ownedTs").topCard.cardId).toBe("BT26-015");
    expect(protectedCase.state.players[0]!.security.at(-1)?.cardId).toBe("BT26-033");

    const filteredCase = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "jupitermon", under: [{ card: "BT26-030", as: "base" }] },
            { card: "BT1-009", as: "nonTs" },
          ],
          security: [{ card: "BT1-001", as: "security" }],
        },
        1: { battleArea: [{ card: "BT26-015", as: "opponentTs" }] },
      },
      { autoAcceptOptional: true },
    );
    await filteredCase.ready();
    expect(
      await advance(filteredCase.engine).verb.deletePermanent(
        [filteredCase.perm("nonTs").permanentId, filteredCase.perm("opponentTs").permanentId],
        "byEffect",
      ),
    ).toBe(2);
    expect(filteredCase.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([CARD_ID]);
    expect(filteredCase.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses Alliance during a real attack and suspends the chosen ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "jupitermon" },
            { card: "BT26-013", as: "ally", dp: 6000 },
          ],
        },
        1: { security: [{ card: "BT1-001", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jupitermon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended && s.state.players[1]!.security.length === 0);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("keeps Wide Plasment's use cost equal to 2 plus live security and resolves its full Main body (Q7006)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-086", as: "tsTamer" }],
          hand: [{ card: "BT26-033", as: "widePlasment" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: [{ card: "BT1-004", as: "recovery" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowestA", dp: 3000 },
            { card: "BT1-010", as: "lowestB", dp: 3000 },
            { card: "BT1-080", as: "higher", dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("widePlasment").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("widePlasment").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-080"]);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });
});
