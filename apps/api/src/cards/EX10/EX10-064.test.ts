import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-064.js";
import { allowsExtraDigiXrosMaterials } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX10-064", () => {
  it("registers the replacement as a one-under-Tamer plus one-trash DigiXros expansion", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0] as {
      additionalEffects?: Array<{ kind: string }>;
    };
    expect(replacement.additionalEffects).toEqual([
      { kind: "AllowDigiXrosMaterialsFromTrash" },
      { kind: "DigiXrosExtraMaterial" },
    ]);
    expect(allowsExtraDigiXrosMaterials("EX10-064")).toBe(true);
    expect(compiled.coverage).toBe("full");
  });

  it("legally uses a card under a Tamer as a DigiXros material when the Tamer pays the cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-064", as: "tamer", under: [{ card: "BT10-008", as: "under" }] }],
        hand: [{ card: "BT10-009", as: "xros" }],
      },
    });
    s.state.memory = 7;
    const tamerId = s.perm("tamer").permanentId;
    const underId = s.inst("under").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xros").instanceId,
        digiXros: { materialInstanceIds: [underId], expanderPermanentIds: [tamerId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-009"));
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT10-009");
    expect(played?.stack.some((card) => card.instanceId === underId)).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});
