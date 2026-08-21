import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT17-003.js";

describe("BT17-003 Bibimon", () => {
  it("gains 1 memory when an effect places a Tamer in this Digimon's stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", as: "host", under: ["BT17-003", { card: "BT17-079", as: "tamer" }] }],
      },
    });
    await s.ready();
    const host = s.perm("host");
    const tamer = host.stack.find((card) => card.cardId === "BT17-079")!;
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [tamer.instanceId],
    });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("does not trigger for a non-Tamer card and triggers only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-030",
            as: "host",
            under: ["BT17-003", { card: "BT1-009", as: "digimon" }, { card: "BT17-079", as: "tamer" }],
          },
        ],
      },
    });
    await s.ready();
    const host = s.perm("host");
    const digimon = host.stack.find((card) => card.cardId === "BT1-009")!;
    const tamer = host.stack.find((card) => card.cardId === "BT17-079")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [digimon.instanceId],
    });
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [tamer.instanceId],
    });
    await settle(() => s.state.memory === 1);
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [tamer.instanceId],
    });

    expect(s.state.memory).toBe(1);
  });
});
