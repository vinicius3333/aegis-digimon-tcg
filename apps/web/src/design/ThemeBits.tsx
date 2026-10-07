import type { InterfaceColors } from "./interfaceThemeColors";

/** Static mirrored 4×4 glyphs, using the same pixel grammar as PixelBackdrop. */
export function ThemeBits({ colors, seed }: { colors: InterfaceColors; seed: string }) {
  const hash = [...seed].reduce((value, letter) => value * 31 + letter.charCodeAt(0), 0) >>> 0;
  const cells = [
    { x: 2, y: 2, color: colors.accent, glyph: (hash & 255) | 0b01101001 },
    { x: 24, y: 2, color: colors.text, glyph: ((hash >>> 8) & 255) | 0b10010110 },
    { x: 2, y: 24, color: colors.text, glyph: ((hash >>> 16) & 255) | 0b01011010 },
    { x: 24, y: 24, color: colors.accent, glyph: ((hash >>> 24) & 255) | 0b10100101 },
  ];
  return (
    <svg className="aegis-theme-picker__bits" viewBox="0 0 44 44" aria-hidden="true" shapeRendering="crispEdges">
      <rect width="44" height="44" fill={colors.surface} />
      {cells.map((cell, index) => (
        <g key={index} fill={cell.color} opacity={index === 1 || index === 2 ? 0.35 : 1}>
          {Array.from({ length: 16 }, (_, bit) => {
            const row = Math.floor(bit / 4);
            const column = bit % 4;
            if (!(cell.glyph & (1 << (row * 2 + Math.min(column, 3 - column))))) return null;
            return <rect key={bit} x={cell.x + column * 4} y={cell.y + row * 4} width="3" height="3" />;
          })}
        </g>
      ))}
    </svg>
  );
}
