import { PackOpeningEngine } from "@/packOpening/PackOpeningEngine";
import { useSoloPackOpeningSource } from "@/packOpening/useSoloPackOpeningSource";

type Props = { onBack?: () => void };

export function PackOpening({ onBack }: Props = {}) {
  const source = useSoloPackOpeningSource();
  return <PackOpeningEngine source={source} onBack={onBack} />;
}
