import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-045 FunBeemon", () => {
  it("has the free level-2 Royal Base evolution route", () => {
    expect(digivolutionRequirementsFor("BT19-045")).toContainEqual({
      level: 2, traits: ["Royal Base"], cost: 0, isAlternate: true,
    });
  });

  it("face-up in security gives all and only controller Royal Base Digimon +1000 DP", async () => {
    const s = setupEngine({ 0: {
      security: [{ card: "BT19-045", faceUp: true }],
      battleArea: [{ card: "BT19-048", as: "royal" }, { card: "BT19-046", as: "plain" }],
    } });
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(5000);
    expect(s.perm("plain").currentDP).toBe(3000);
  });

  it("a face-down security copy provides no Royal Base DP buff", async () => {
    const s = setupEngine({ 0: {
      security: ["BT19-045"], battleArea: [{ card: "BT19-048", as: "royal" }],
    } });
    await s.ready();
    expect(s.perm("royal").currentDP).toBe(4000);
  });

  it("reduces a battle-area Royal Base digivolution by 1", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-045", as: "fun" }], hand: [{ card: "BT19-048", as: "forge" }], deck: ["BT19-030"],
    } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "digivolve", permanentId: s.perm("fun").permanentId, instanceId: s.inst("forge").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("fun").topCard?.cardId === "BT19-048");
    expect(s.state.memory).toBe(3);
  });

  it("does not trigger its cost reduction from the breeding area (Q3097)", async () => {
    const s = setupEngine({ 0: {
      breeding: { card: "BT19-045", as: "fun" }, hand: [{ card: "BT19-048", as: "forge" }], deck: ["BT19-030"],
    } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "digivolve", permanentId: s.perm("fun").permanentId, instanceId: s.inst("forge").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("fun").topCard?.cardId === "BT19-048");
    expect(s.state.memory).toBe(2);
  });

  it("inherited All Turns gives its evolution host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-048", as: "host", under: ["BT19-045"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
