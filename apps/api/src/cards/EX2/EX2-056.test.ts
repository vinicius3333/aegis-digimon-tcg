import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-056.js";
import "./EX2-009.js";

describe("EX2-056 Takato Matsuki", () => {
  it("may suspend to gain 1 memory when an opposing Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-009", as: "attacker" },
            { card: "EX2-056", as: "takato" },
          ],
        },
        1: { battleArea: [{ card: "EX2-019", as: "target", dp: 1000 }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.perm("takato").isSuspended);
    expect(s.state.memory).toBe(4);
    expect(s.perm("takato").isSuspended).toBe(true);
  });

  it("grants Blitz to the Digimon evolving into Growlmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-008", as: "guilmon" },
            { card: "EX2-056", as: "takato" },
          ],
          hand: [{ card: "EX2-009", as: "growlmon" }],
          deck: ["BT1-001"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("growlmon").instanceId);

    expect(observe(s.engine).hasKeyword(s.perm("guilmon"), "Blitz")).toBe(true);
  });

  it("does not grant Blitz to an unrelated red evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-03", as: "agumon" },
            { card: "EX2-056", as: "takato" },
          ],
          hand: [{ card: "ST1-07", as: "greymon" }],
          deck: ["BT1-001"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.instanceId === s.inst("greymon").instanceId);

    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Blitz")).toBe(false);
  });
});
