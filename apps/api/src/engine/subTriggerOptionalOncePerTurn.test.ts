import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("optional actions in once-per-turn subtriggers", () => {
  it("keeps the watcher available when every optional action is declined", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-074", as: "vortex" }],
          hand: [
            { card: "EX11-026", as: "producerA" },
            { card: "EX11-026", as: "producerB" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "opponent" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["Unsuspend", "Battle"],
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("vortex").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producerA").instanceId })).toMatchObject({
      ok: true,
    });
    await settle(() => s.perm("vortex").isSuspended);
    await settle(() =>
      s.decisions.some(({ req }) => req.kind === "optional" && (req.promptText ?? "").includes("Unsuspend")),
    );
    expect(s.perm("vortex").isSuspended).toBe(true);

    const firstUnsuspendOfferCount = s.decisions.filter(
      ({ req }) => req.kind === "optional" && (req.promptText ?? "").includes("Unsuspend"),
    ).length;
    preferred.splice(0, preferred.length, s.perm("opponent").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producerB").instanceId })).toMatchObject({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);
    expect(
      s.decisions.filter(({ req }) => req.kind === "optional" && (req.promptText ?? "").includes("Unsuspend")),
    ).toHaveLength(firstUnsuspendOfferCount + 1);
  });

  it("keeps a use consumed when one optional action is accepted and a later one is declined", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-074", as: "vortex" }],
          hand: [
            { card: "EX11-026", as: "producerA" },
            { card: "EX11-026", as: "producerB" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "opponent" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["Battle"],
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("vortex").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producerA").instanceId })).toMatchObject({
      ok: true,
    });
    await settle(() => s.perm("vortex").isSuspended);
    await settle(() =>
      s.decisions.some(({ req }) => req.kind === "optional" && (req.promptText ?? "").includes("Unsuspend")),
    );
    expect(s.perm("vortex").isSuspended).toBe(false);
    const firstUnsuspendOfferCount = s.decisions.filter(
      ({ req }) => req.kind === "optional" && (req.promptText ?? "").includes("Unsuspend"),
    ).length;

    preferred.splice(0, preferred.length, s.perm("opponent").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("producerB").instanceId })).toMatchObject({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);
    expect(
      s.decisions.filter(({ req }) => req.kind === "optional" && (req.promptText ?? "").includes("Unsuspend")),
    ).toHaveLength(firstUnsuspendOfferCount);
  });
});
