import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-051.js";

describe("BT14-051", () => it("once per turn at the end of the opponent's turn reveals five and adds two green Digimon by suspending an own Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "RevealAdd", revealCount: 5, rest: "deckBottom", cost: { kind: "suspend" }, add: [{ count: 2, to: "hand", filter: { colors: ["Green"] } }] }] })));
