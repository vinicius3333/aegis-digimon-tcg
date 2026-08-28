import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX3-002.js";

describe("EX3-002 Missimon", () => {
  it("matches its official identity and inherited Reboot text", () => {
    expect(getCardDefinition("EX3-002")).toMatchObject({
      nameEn: "Missimon",
      colors: ["Black"],
      level: 2,
      forms: ["In-Training"],
      types: ["Machine"],
      imageId: "EX3-002",
      inheritedEffectText:
        "[Opponent's Turn] While you have another Digimon with [D-Brigade] in its traits in play, this Digimon gains ＜Reboot＞. (Unsuspend this Digimon during your opponent's unsuspend phase.)",
    });
  });

  it("publishes only the conditional inherited Reboot aura", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]?.actions).toHaveLength(1);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Reboot" } },
      while: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          excludeSelf: true,
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["D-Brigade"], match: "trait" }],
        },
      },
    });
  });

  it("grants Reboot only on the opponent's turn while another D-Brigade Digimon is present", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["EX3-002"], as: "carrier" }, "EX3-046"] },
    });
    const carrier = s.perm("carrier");
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(carrier, "Reboot")).toBe(false);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(carrier, "Reboot")).toBe(true);

    s.state.players[0]!.battleArea.splice(1, 1);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(carrier, "Reboot")).toBe(false);
  });

  it("does not let the carrier itself or a non-Digimon satisfy the other D-Brigade requirement", async () => {
    const selfOnly = setupEngine({
      0: { battleArea: [{ card: "EX3-046", under: ["EX3-002"], as: "carrier" }] },
    });
    selfOnly.state.turnSeat = 1;
    await selfOnly.engine.recomputeContinuousEffects();
    expect(observe(selfOnly.engine).hasKeyword(selfOnly.perm("carrier"), "Reboot")).toBe(false);

    const tamerOnly = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["EX3-002"], as: "carrier" }, "EX3-065"] },
    });
    tamerOnly.state.turnSeat = 1;
    await tamerOnly.engine.recomputeContinuousEffects();
    expect(observe(tamerOnly.engine).hasKeyword(tamerOnly.perm("carrier"), "Reboot")).toBe(false);
  });

  it("executes Reboot during the opponent's unsuspend phase without a decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", under: ["EX3-002"], as: "carrier", suspended: true }, "EX3-046"],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    await (s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }).unsuspendForActivePhase(
      1,
    );
    expect(s.perm("carrier").isSuspended).toBe(false);
    expect(s.decisions).toHaveLength(0);
  });
});
