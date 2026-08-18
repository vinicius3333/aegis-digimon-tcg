import { describe, expect, it } from "vitest";
import { pathForRoute, routeFromPathname } from "./routes";

describe("application routes", () => {
  it.each([
    ["/", { screen: "home" }],
    ["/onboarding", { screen: "onboarding" }],
    ["/play", { screen: "lobby" }],
    ["/decks", { screen: "deck" }],
    ["/collection", { screen: "collection" }],
    ["/settings", { screen: "settings" }],
    ["/tournaments", { screen: "tournaments", tournament: { kind: "catalog" } }],
    ["/tournaments/new", { screen: "tournaments", tournament: { kind: "create" } }],
    ["/tournaments/cup%20one", { screen: "tournaments", tournament: { kind: "detail", id: "cup one" } }],
  ])("parses %s", (pathname, expected) => {
    expect(routeFromPathname(pathname)).toEqual(expected);
  });

  it("builds an encoded tournament detail path", () => {
    expect(pathForRoute({ screen: "tournaments", tournament: { kind: "detail", id: "cup one" } })).toBe(
      "/tournaments/cup%20one",
    );
  });

  it("rejects unknown and malformed paths", () => {
    expect(routeFromPathname("/unknown")).toBeUndefined();
    expect(routeFromPathname("/tournaments/%E0%A4%A")).toBeUndefined();
  });
});
