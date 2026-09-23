// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { isMobileComponentsLabPath } from "../App";
import { MobileComponentsLab, specimenFrameUrl } from "./MobileComponentsLab";
import { SPECIMEN_GROUPS, SPECIMENS } from "./mobileLabSpecimens";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function renderAt(url: string) {
  window.history.replaceState(null, "", url);
  return render(
    <I18nProvider>
      <MobileComponentsLab />
    </I18nProvider>,
  );
}

describe("MobileComponentsLab", () => {
  it("lists every specimen in a lazy phone frame, grouped by area", () => {
    const { container } = renderAt("/dev/mobile");
    for (const group of SPECIMEN_GROUPS) {
      expect(container.querySelector(`#mobile-lab-${group.toLowerCase()}`), `missing group ${group}`).not.toBeNull();
    }
    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(SPECIMENS.length);
    for (const frame of frames) {
      expect(frame.getAttribute("loading")).toBe("lazy");
      expect(frame.getAttribute("width")).toBe("390");
      expect(frame.getAttribute("height")).toBe("844");
    }
  });

  it("keeps specimen ids unique", () => {
    expect(new Set(SPECIMENS.map((specimen) => specimen.id)).size).toBe(SPECIMENS.length);
  });

  it.each(SPECIMENS.map((specimen) => [specimen.id]))("renders %s alone in frame mode", (id) => {
    const { container } = renderAt(specimenFrameUrl(id, "pt-BR"));
    expect(container.ownerDocument.querySelector(`[data-specimen="${id}"]`)).not.toBeNull();
  });

  it("routes only the lab path", () => {
    expect(isMobileComponentsLabPath("/dev/mobile")).toBe(true);
    expect(isMobileComponentsLabPath("/dev/mobile/")).toBe(true);
    expect(isMobileComponentsLabPath("/dev/mobiles")).toBe(false);
  });
});
