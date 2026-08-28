// @vitest-environment jsdom

import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { BetaBanner } from "./BetaBanner";

function renderBanner() {
  return render(
    <I18nProvider>
      <BetaBanner />
    </I18nProvider>,
  );
}

describe("beta banner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("warns that the game is in beta and links to the bug report channel", () => {
    const view = renderBanner();

    expect(view.getByRole("status").textContent?.toLowerCase()).toContain("beta");
    expect(view.getByRole("link").getAttribute("href")).toContain("discord");
    view.unmount();
  });

  it("stays dismissed across renders", () => {
    const first = renderBanner();
    fireEvent.click(first.getByRole("button"));
    expect(first.queryByRole("status")).toBeNull();
    first.unmount();

    const second = renderBanner();
    expect(second.queryByRole("status")).toBeNull();
    second.unmount();
  });
});
