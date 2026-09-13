import { beforeEach, describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

const KB_SHA256 = "bea2acb41142c08a4ce511f19dd3e0c0b2069a500a9a419267b553f3685e8b8a";
const FIELD_SHA256 = "093bed0b47c2f911dafd1a38b59725fd0383107ab737ab490195dfbd30917b30";

describe("Use Req. field and trait conditions", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0261",
      "§16-42-1/3: Use Req. waives the Option color requirement for the specified matching cards on the field",
      KB_SHA256,
    );
    cite("comprehensive-0060", "§3-4-6: the field consists of the battle area and the breeding area", FIELD_SHA256);
  });

  it("waives BT26-080's Purple Option requirement for a TS Digimon in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT25-077", as: "tsBreeding" },
          hand: [{ card: "BT26-080", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: false }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionInstanceId = s.inst("option").instanceId;
    const targetId = s.perm("target").permanentId;
    const targetInstanceId = s.inst("target").instanceId;
    const breedingInstanceId = s.inst("tsBreeding").instanceId;
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(breedingInstanceId);
    expect(s.state.memory).toBe(0);
  });

  it("rejects the same Purple Option when only a non-TS green card is in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-080", as: "nonTsBreeding" },
        hand: [{ card: "BT26-080", as: "option" }],
      },
    });
    const optionInstanceId = s.inst("option").instanceId;
    const breedingInstanceId = s.inst("nonTsBreeding").instanceId;
    const initialTrash = s.state.players[0]!.trash.map((card) => card.instanceId);
    await s.ready();
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(breedingInstanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(initialTrash);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
