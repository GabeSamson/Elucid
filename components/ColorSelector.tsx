'use client';

import { motion } from 'framer-motion';

interface ColorOption {
  name: string;
  hexCode: string;
}

interface ColorSelectorProps {
  colors: ColorOption[];
  selectedColor: string | null;
  onColorSelect: (colorName: string) => void;
  availableColors?: string[]; // Colors that have stock for current size selection
}

export default function ColorSelector({
  colors,
  selectedColor,
  onColorSelect,
  availableColors,
}: ColorSelectorProps) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-charcoal">
        Color{selectedColor && `: ${selectedColor}`}
      </label>

      <div className="flex flex-wrap gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color.name;
          const isAvailable = !availableColors || availableColors.includes(color.name);

          return (
            <motion.button
              key={color.name}
              type="button"
              onClick={() => isAvailable && onColorSelect(color.name)}
              disabled={!isAvailable}
              className={`relative group h-14 w-14 overflow-hidden rounded-full border transition-all duration-200 ${
                isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              } ${
                isSelected
                  ? 'border-charcoal shadow-lg ring-4 ring-charcoal/10'
                  : 'border-charcoal/15 hover:border-charcoal/40'
              }`}
              whileHover={isAvailable ? { scale: 1.04 } : {}}
              whileTap={isAvailable ? { scale: 0.96 } : {}}
              style={{ backgroundColor: '#f9f5f2' }}
            >
              <span
                className="absolute inset-1 rounded-full border border-charcoal/10"
                style={{ backgroundColor: color.hexCode }}
              />

              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              )}

              {!isAvailable && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-16 h-0.5 bg-charcoal/60 rotate-45" />
                </span>
              )}

              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded bg-charcoal px-2 py-1 text-xs text-cream opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-10">
                {color.name}
                {!isAvailable && <span className="ml-1 text-cream/70">(Out of Stock)</span>}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
