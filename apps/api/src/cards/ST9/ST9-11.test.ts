import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST9-11.js";

describe("ST9-11 Dinobeemon", () => {
  it("suspends but does not freeze on an ordinary digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST9-09", as: "base" }], hand: [{ card: "ST9-11", as: "dinobee" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dinobee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });

  it("suspends and freezes the selected Digimon after DNA digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "blue" },
            { card: "ST9-09", as: "green" },
          ],
          hand: [{ card: "ST9-11", as: "dinobee" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("dinobee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("freezes exactly the Digimon selected for suspension and counts only the host's two colors", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "blue" },
            { card: "ST9-09", as: "green" },
            { card: "BT1-025", as: "redAlly" },
          ],
          hand: [
            { card: "ST9-11", as: "dinobee" },
            { card: "ST9-06", as: "dragonMode" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
        autoDeclineOptional: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("chosen").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("dinobee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "unsuspend"));

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "unsuspend")).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("other"), "unsuspend")).toBe(false);

    const dnaHost = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST9-11")!;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: dnaHost.permanentId,
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => dnaHost.topCard.cardId === "ST9-06" && dnaHost.currentDP === 14000);

    expect(dnaHost.currentDP).toBe(14000);
  });
});
