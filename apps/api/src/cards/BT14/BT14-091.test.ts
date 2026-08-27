import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-091.js";

describe("BT14-091", () => {
  it("trashes two opposing digivolution cards across Digimon and conditionally unsuspends the chosen Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 2,
      scope: "acrossDigimon",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "SelectBind", target: { bindAs: "chosen" } });
    expect(compiled.effects?.[0]?.actions[2]).toMatchObject({
      kind: "Unsuspend",
      target: { fromSelectionRef: "chosen" },
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
    });
    expect(compiled.effects?.[0]?.actions[2]).toMatchObject({ condition: { kind: "opponentHasNone" } });
  });

  it("activates its main effect and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }],
    });
  });
});
