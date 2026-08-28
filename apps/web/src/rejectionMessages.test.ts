import { describe, expect, it } from "vitest";
import { translator } from "./i18n";
import { rejectionMessage } from "./rejectionMessages";

describe("rejectionMessage", () => {
  it("explains a play prohibition as an effect restriction in Portuguese", () => {
    expect(rejectionMessage("play-prohibited", translator("pt-BR"))).toBe(
      "Um efeito em jogo impede que esta carta seja jogada",
    );
  });

  it("explains a play prohibition as an effect restriction in English", () => {
    expect(rejectionMessage("play-prohibited", translator("en"))).toBe(
      "An effect in play prevents this card from being played",
    );
  });

  it("keeps an unknown runtime reason visible instead of hiding it", () => {
    expect(rejectionMessage("custom-runtime-reason", translator("pt-BR"))).toBe("custom-runtime-reason");
  });
});
