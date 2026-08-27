import { describe, expect, it } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
