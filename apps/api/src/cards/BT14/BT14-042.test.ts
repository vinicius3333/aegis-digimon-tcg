import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-042.js";

describe("BT14-042", () => it("reveals three and adds a green card by suspending itself", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", cost: { kind: "suspend" }, add: [{ to: "hand", filter: { colors: ["Green"] } }] })));
