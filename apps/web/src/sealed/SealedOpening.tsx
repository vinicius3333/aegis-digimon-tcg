import { useEffect } from "react";
import type { PackOpeningSource } from "@/packOpening/PackOpeningSource";
import { PackOpeningEngine } from "@/packOpening/PackOpeningEngine";
import { useTranslation } from "@/i18n/useTranslation";

type Props = { source: PackOpeningSource; onClose: () => void };

export function SealedOpening({ source, onClose }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);
  return <PackOpeningEngine source={source} onBack={onClose} backLabel={t("sealed.builder")} />;
}
