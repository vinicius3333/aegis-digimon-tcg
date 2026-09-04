import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-041.js";
import "../index.js";

describe("EX5-041 Ebonwumon", () => {
  it("suspends one opposing Digimon for one own Deva through public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-041", as: "source" }], battleArea: [{ card: "BT10-079", as: "deva" }] },
        1: { battleArea: [{ card: "BT1-021", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(true);
  });
  it("has Blast Digivolve and suspends opponent Digimon based on own Deva/Four Sovereigns count", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toMatchObject([
      { keyword: "BlastDigivolve" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "scaling", upTo: true },
      scaling: {
        per: 1,
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }],
        },
        unit: "cards",
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "scaling", upTo: true },
      scaling: { per: 1, unit: "cards" },
    });
  });
  it("prevents opponent Digimon from unsuspending until their next unsuspend phase and deletes one suspended Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[1]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentNextUnsuspendPhase",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: true }, count: 1 },
    });
  });

  it("deletes one suspended opponent Digimon when it leaves through the public deletion seam", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-041", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "suspended", suspended: true },
            { card: "BT1-021", as: "active" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    const suspendedId = s.perm("suspended").permanentId;
    const activeId = s.perm("active").permanentId;
    const deleted = await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    expect(deleted).toBe(1);
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === suspendedId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-021" && p.isSuspended)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === activeId)).toBe(true);
  });

  it("suspends up to two opposing Digimon when two own Deva are present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-041", as: "source" }],
          battleArea: [
            { card: "BT10-079", as: "devaOne" },
            { card: "BT10-079", as: "devaTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "opponentOne" },
            { card: "BT1-021", as: "opponentTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("opponentOne").isSuspended).toBe(true);
    expect(s.perm("opponentTwo").isSuspended).toBe(true);
  });
});
