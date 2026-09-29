import { describe, expect, it } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT19/BT19-077.js";
import "./BT5-067.js";

describe("BT5-067 Infermon", () => {
  it("digivolves over Keramon in the battle area for the alternate cost of 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-059", as: "keramon" }],
        hand: [{ card: "BT5-067", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("keramon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("keramon").topCard.cardId === "BT5-067");
    expect(s.state.memory).toBe(0);
  });

  it("Q1342 rejects the Keramon shortcut in the breeding area", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT5-059", as: "keramon" },
        hand: [{ card: "BT5-067", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("keramon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("only the named Keramon receives the alternate evolution shortcut", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-061", as: "notKeramon" }],
        hand: [{ card: "BT5-067", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("notKeramon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not treat Keramon (X Antibody) as the exact Keramon shortcut", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-052", as: "keramonX" }],
        hand: [{ card: "BT5-067", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("keramonX").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may play a Diaboromon Token when its host is deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-069", as: "host", under: ["BT5-067"] }] } },
      { autoAcceptOptional: true },
    );
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.includes("TOKEN")));
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "TOKEN-Diaboromon");
    expect(token).toBeDefined();
    expect(token!.controllerSeat).toBe(0);
    expect(token!.topCard!.ownerSeat).toBe(0);
    expect(token!.topCard!.faceUp).toBe(true);
    expect(requireCardDefinition(token!.topCard!.cardId)).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      playCost: 14,
      dp: 3000,
      colors: ["White"],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
      isToken: true,
    });
  });

  it("allows declining the inherited Token effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-069", as: "host", under: ["BT5-067"] }] } },
      { autoDeclineOptional: true },
    );
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});

describe("BT5-067 Infermon — KB Q&A rulings", () => {
  it("plays a Diaboromon Token as a Digimon that leaves no card behind when it is deleted (Q1343)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-069", as: "host", under: [{ card: "BT5-067", as: "infermon" }] }] } },
      { autoAcceptOptional: true },
    );
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Diaboromon"));

    const token = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "TOKEN-Diaboromon")!;
    expect(requireCardDefinition(token.topCard!.cardId)).toMatchObject({
      nameEn: "Diaboromon",
      kinds: ["Digimon"],
      isToken: true,
    });
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT5-067", "BT5-069"]);

    await advance(s.engine).verb.deletePermanent([token.permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT5-067", "BT5-069"]);
  });

  it("lets a digivolve effect digivolve a battle-area Keramon into it from hand (Q1344)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT5-059", as: "keramon" },
          ],
          hand: [{ card: "BT5-067", as: "infermon" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.inst("keramon").instanceId, s.inst("infermon").instanceId);
    const keramonInstanceId = s.inst("keramon").instanceId;

    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(entries).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("keramon").topCard?.cardId === "BT5-067");
    await settle(() => false, 30);

    expect(s.perm("calumon").isSuspended).toBe(true);
    expect(s.perm("keramon").topCard?.cardId).toBe("BT5-067");
    expect(s.perm("keramon").stack.map((card) => card.instanceId)).toEqual([keramonInstanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);

    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT5-061", as: "commandramon" },
          ],
          hand: [{ card: "BT5-067", as: "infermon" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 3;
    await control.ready();
    expect(control.perm("calumon").activatableEffectsJson || "[]").toBe("[]");
    expect(
      control.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: control.perm("calumon").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }).ok,
    ).toBe(false);
    await settle(() => false, 30);

    expect(control.perm("commandramon").topCard?.cardId).toBe("BT5-061");
    expect(control.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT5-067"]);
    expect(control.state.memory).toBe(3);
  });
});
