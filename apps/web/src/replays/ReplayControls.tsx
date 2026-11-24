import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "@/i18n";

type Props = { children: ReactNode; visible: boolean; onDockedInsetChange?: (inset: number) => void };

export function ReplayControls({ children, visible, onDockedInsetChange }: Props) {
  const { t } = useTranslation();
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = bar.current;
    if (!element || !onDockedInsetChange) {
      return;
    }
    const report = () => onDockedInsetChange(visible ? element.getBoundingClientRect().height : 0);
    report();
    const resize = new ResizeObserver(report);
    resize.observe(element);
    return () => resize.disconnect();
  }, [visible, onDockedInsetChange]);

  return (
    <div
      ref={bar}
      id="replay-controls"
      className="replay-controls"
      role="group"
      aria-label={t("replay.title")}
      hidden={!visible}
    >
      {children}
    </div>
  );
}
