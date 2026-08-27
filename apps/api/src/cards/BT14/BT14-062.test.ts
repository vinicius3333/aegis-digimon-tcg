import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-062.js";

describe("BT14-062", () =>
  it("prevents opponent effects from deleting this card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "beDeleted",
      duration: "permanent",
      byOpponentEffectsOnly: true,
    })));
