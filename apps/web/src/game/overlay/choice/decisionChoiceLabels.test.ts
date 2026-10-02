import { describe, expect, it } from "vitest";
import { translator } from "../../../i18n";
import { choiceLabel } from "./decisionChoiceLabels";

describe("choiceLabel top and bottom", () => {
  const pt = translator("pt-BR");
  const en = translator("en");

  it("names the digivolution-card ends when the choice places digivolution cards (Discord 1555224478416633927)", () => {
    expect(choiceLabel({ choice: "top", t: pt, topBottomZone: "digivolutionCards" })).toBe(
      "Topo das cartas de digievolução",
    );
    expect(choiceLabel({ choice: "bottom", t: pt, topBottomZone: "digivolutionCards" })).toBe(
      "Fundo das cartas de digievolução",
    );
    expect(choiceLabel({ choice: "bottom", t: en, topBottomZone: "digivolutionCards" })).toBe(
      "Bottom of the digivolution cards",
    );
  });

  it("names the security-stack ends for a security choice", () => {
    expect(choiceLabel({ choice: "top", t: pt, topBottomZone: "security" })).toBe("Topo da pilha de segurança");
    expect(choiceLabel({ choice: "bottom", t: en, topBottomZone: "security" })).toBe("Bottom of the security stack");
  });

  it("keeps the deck ends for a deck choice and for a decision without a zone", () => {
    expect(choiceLabel({ choice: "top", t: pt, topBottomZone: "deck" })).toBe("Topo do deck");
    expect(choiceLabel({ choice: "bottom", t: pt })).toBe("Fundo do deck");
  });
});
