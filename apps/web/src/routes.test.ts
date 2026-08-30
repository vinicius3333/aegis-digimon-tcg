import { describe, expect, it } from "vitest";
import { routeFromPathname } from "./routes";

describe("application routes", () => {
  it.each([
    ["/", { screen: "home" }],
    ["/login", { screen: "login" }],
    ["/play", { screen: "lobby" }],
    ["/decks", { screen: "deck" }],
    ["/collection", { screen: "collection" }],
    ["/settings", { screen: "settings" }],
  ])("parses %s", (pathname, expected) => {
    expect(routeFromPathname(pathname)).toEqual(expected);
  });

  it("rejects unknown paths, tournaments included while the feature is hidden", () => {
    expect(routeFromPathname("/unknown")).toBeUndefined();
    expect(routeFromPathname("/tournaments")).toBeUndefined();
  });
});
