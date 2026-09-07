import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("public App Fusion digivolve intent", () => {
  it.each([false, true])("App Fuses the declared pair at cost 0 preserving suspended=%s", async (suspended) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", suspended, linked: [{ card: "BT21-047", as: "partner" }] }],
          hand: [{ card: "BT21-018", as: "result" }],
          deck: [{ card: "BT1-001", as: "draw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const partnerId = s.inst("partner").instanceId;
    const resultId = s.inst("result").instanceId;
    const hostId = s.perm("host").permanentId;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: resultId,
        appFusionLinkedInstanceId: partnerId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === resultId && s.perm("host").isSuspended === suspended);

    expect(s.perm("host").topCard.cardId).toBe("BT21-018");
    expect(s.perm("host").isSuspended).toBe(suspended);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-009", "BT21-047"]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").enteredByEffect).toBe(false);
  });

  it("rejects an App Fusion intent when the linked partner is the wrong name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: "BT21-070", as: "wrong" }] }],
        hand: [{ card: "BT21-018", as: "result" }],
      },
    });
    const resultId = s.inst("result").instanceId;
    const partnerId = s.inst("wrong").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: resultId,
        appFusionLinkedInstanceId: partnerId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("host").topCard.cardId).toBe("BT21-009");
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([partnerId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(resultId);
  });

  it("rejects duplicate-name App Fusion materials instead of treating them as distinct names", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: "BT21-009", as: "duplicate" }] }],
        hand: [{ card: "BT21-018", as: "result" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("result").instanceId,
        appFusionLinkedInstanceId: s.inst("duplicate").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("host").topCard.cardId).toBe("BT21-009");
    expect(s.perm("host").linked).toHaveLength(1);
  });

  it("rejects an App Fusion attempt on an opponent-controlled host", async () => {
    const s = setupEngine({
      1: {
        battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: "BT21-047", as: "partner" }] }],
      },
      0: { hand: [{ card: "BT21-018", as: "result" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("result").instanceId,
        appFusionLinkedInstanceId: s.inst("partner").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("host").topCard.cardId).toBe("BT21-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("result").instanceId);
  });

  it("rejects an App Fusion attempt on a breeding-area host", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-009", as: "host", linked: [{ card: "BT21-047", as: "partner" }] },
        hand: [{ card: "BT21-018", as: "result" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("result").instanceId,
        appFusionLinkedInstanceId: s.inst("partner").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("host").topCard.cardId).toBe("BT21-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("result").instanceId);
  });

  it("rejects an App Fusion result that is not in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: "BT21-047", as: "partner" }] }],
        trash: [{ card: "BT21-018", as: "result" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("result").instanceId,
        appFusionLinkedInstanceId: s.inst("partner").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("host").topCard.cardId).toBe("BT21-009");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("result").instanceId);
  });

  it("keeps the ordinary printed cost and linked card when App Fusion is not declared", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: "BT21-047", as: "partner" }] }],
        hand: [{ card: "BT21-018", as: "result" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("result").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-018" && s.state.memory === 2);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-009"]);
    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual(["BT21-047"]);
    expect(s.state.memory).toBe(2);
  });

  it.each([false, true])("applies the source-less host cost increase with effect-driven=%s", async (byEffect) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "host", linked: byEffect ? [] : [{ card: "BT21-047", as: "partner" }] },
            ...(byEffect ? [{ card: "BT21-084", as: "haru" }] : []),
          ],
          hand: [{ card: "BT21-018", as: "result" }, ...(byEffect ? [{ card: "BT21-047", as: "partner" }] : [])],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "EX3-019", as: "paledramon", under: ["EX3-016"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const partnerId = s.inst("partner").instanceId;
    const resultId = s.inst("result").instanceId;
    s.state.memory = byEffect ? 2 : 1;
    await s.ready();

    expect(
      s.engine.applyIntent(
        0,
        byEffect
          ? { type: "linkCard", targetPermanentId: s.perm("host").permanentId, instanceId: partnerId }
          : {
              type: "digivolve",
              permanentId: s.perm("host").permanentId,
              instanceId: resultId,
              appFusionLinkedInstanceId: partnerId,
            },
      ),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === resultId && s.perm("host").linked.length === 0);

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-009", "BT21-047"]);
    expect(s.state.memory).toBe(0);
  });

  it("keeps App Fusion at printed cost 0 with a legal Lv2 Appmon source under Gatchmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "host", under: ["BT21-005"], linked: [{ card: "BT21-047", as: "partner" }] },
        ],
        hand: [{ card: "BT21-018", as: "result" }],
      },
      1: { battleArea: [{ card: "EX3-019", as: "paledramon", under: ["EX3-016"] }] },
    });
    const partnerId = s.inst("partner").instanceId;
    const resultId = s.inst("result").instanceId;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: resultId,
        appFusionLinkedInstanceId: partnerId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === resultId && s.perm("host").linked.length === 0);

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-005", "BT21-009", "BT21-047"]);
    expect(s.state.memory).toBe(0);
  });
});
