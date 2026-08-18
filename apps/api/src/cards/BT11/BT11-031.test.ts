import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-031.js";

describe("BT11-031 ZeigGreymon", () => {
  it("publishes the exact MetalGreymon alternate route", () => {
    expect(digivolutionRequirementsFor("BT11-031")).toContainEqual({
      cost: 2,
      isAlternate: true,
      namesExact: ["MetalGreymon"],
    });
  });

  it("unsuspends and gains 2 memory with a Blue Flare source and 2 opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-024", as: "base", suspended: true }],
        hand: [{ card: "BT11-031", as: "zeig" }],
        deck: ["BT1-001"],
      },
      1: { battleArea: ["BT11-023", "BT11-023"] },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("zeig").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.state.memory === 10);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.memory).toBe(10);
  });

  it("saves itself under any Tamer, then places blue Greymon and MailBirdramon under a General", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-031", as: "zeig" },
          { card: "BT11-095", as: "general" },
        ],
        trash: [
          { card: "BT10-019", as: "greymon" },
          { card: "BT10-021", as: "mailBirdramon" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    const zeigInstanceId = s.perm("zeig").topCard!.instanceId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("zeig").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("general").stack.length === 3);

    expect(s.perm("general").stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining([
      zeigInstanceId,
      s.inst("greymon").instanceId,
      s.inst("mailBirdramon").instanceId,
    ]));
  });

  it("inherited effect grants Blocker to a Blue Flare host on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-030", as: "host", under: ["BT11-031"] }] } });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
