import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

type Setup = ReturnType<typeof setupEngine>;

function pickFrom(s: Setup, sourceCardId: string) {
  return s.decisions.find(
    ({ req }) => (req.kind === "selectCards" || req.kind === "chooseTargets") && req.sourceCardId === sourceCardId,
  )?.req;
}

describe("accepted optional picks (Discord 1555073882145423380)", () => {
  async function hydramonSuspendPick() {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-043", as: "base" }], hand: [{ card: "EX3-045", as: "hydramon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-029", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hydramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => pickFrom(s, "EX3-045") !== undefined);
    return { s, pick: pickFrom(s, "EX3-045")! };
  }

  it("lets the controller back out of an accepted Suspend", async () => {
    const { s, pick } = await hydramonSuspendPick();
    expect(pick.kind).toBe("chooseTargets");
    expect(pick.options).toMatchObject({ min: 0, max: 1, purpose: "acceptedOptional" });

    const response = { kind: "chooseTargets" as const, instanceIds: [] as string[] };
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: pick.decisionId, response })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("first").isSuspended).toBe(false);
    expect(s.perm("second").isSuspended).toBe(false);
  });

  it("rejects an accepted pick that names only cards it did not offer", async () => {
    const { s, pick } = await hydramonSuspendPick();
    const response = { kind: "chooseTargets" as const, instanceIds: ["not-offered"] };
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: pick.decisionId, response }).ok).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(pick.decisionId);
  });

  it("lets the controller back out of an accepted Return from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-001", as: "greymon" }],
          trash: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT1-015", as: "greymonCard" },
            { card: "BT1-036", as: "garurumonCard" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => pickFrom(s, "AD1-001") !== undefined);
    const pick = pickFrom(s, "AD1-001")!;
    expect(pick.kind).toBe("selectCards");
    expect(pick.options).toMatchObject({ min: 0, max: 1, purpose: "acceptedOptional" });

    const response = { kind: "selectCards" as const, instanceIds: [] as string[] };
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: pick.decisionId, response })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("agumon").instanceId, s.inst("greymonCard").instanceId, s.inst("garurumonCard").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
