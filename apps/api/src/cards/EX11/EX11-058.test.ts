import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-058.js";

describe("EX11-058 Yao Qinglan", () => {
  it("places an Aqua or Sea Animal card under a matching Digimon and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "host" },
            { card: "EX11-058", as: "yao" },
          ],
          hand: ["BT23-023"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yao"));
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT23-023")).toBe(true);
  });

  it("suspends to draw when an Aqua or Sea Animal Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "gizamon" },
            { card: "EX11-058", as: "yao" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gizamon").permanentId });
    await settle(() => s.perm("yao").isSuspended);

    expect(s.perm("yao").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
  });

  it("leaves Yao unsuspended and draws nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "gizamon" },
            { card: "EX11-058", as: "yao" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gizamon").permanentId });
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("yao").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
  });
});
