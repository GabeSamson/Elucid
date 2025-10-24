export type ColorImageMap = Record<string, string[]>;

export interface ProductImagePayload {
  defaultImages: string[];
  colorImages: ColorImageMap;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const sanitizeImageArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isNonEmptyString);
};

export const normalizeProductImageInput = (
  defaultImagesInput: unknown,
  colorImagesInput: unknown,
): ProductImagePayload => {
  const defaultImages = sanitizeImageArray(defaultImagesInput);

  const colorImages: ColorImageMap = {};

  if (colorImagesInput && typeof colorImagesInput === 'object') {
    Object.entries(colorImagesInput as Record<string, unknown>).forEach(([key, value]) => {
      const trimmedKey = key.trim();
      if (!trimmedKey) return;

      const sanitized = sanitizeImageArray(value);
      if (sanitized.length > 0) {
        colorImages[trimmedKey] = sanitized;
      }
    });
  }

  return {
    defaultImages,
    colorImages,
  };
};

export const serializeProductImages = (payload: ProductImagePayload): string => {
  return JSON.stringify({
    default: payload.defaultImages,
    colors: payload.colorImages,
  });
};

export const parseProductImages = (raw: string | null | undefined): ProductImagePayload => {
  if (!raw) {
    return {
      defaultImages: [],
      colorImages: {},
    };
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return {
        defaultImages: sanitizeImageArray(parsed),
        colorImages: {},
      };
    }

    if (parsed && typeof parsed === 'object') {
      const defaultImages = sanitizeImageArray(
        (parsed as Record<string, unknown>).default,
      );
      const colorsRaw = (parsed as Record<string, unknown>).colors;

      const colorImages: ColorImageMap = {};

      if (colorsRaw && typeof colorsRaw === 'object') {
        Object.entries(colorsRaw as Record<string, unknown>).forEach(([key, value]) => {
          const trimmedKey = key.trim();
          if (!trimmedKey) return;

          const sanitized = sanitizeImageArray(value);
          if (sanitized.length > 0) {
            colorImages[trimmedKey] = sanitized;
          }
        });
      }

      return {
        defaultImages,
        colorImages,
      };
    }
  } catch (error) {
    console.error('Failed to parse product images JSON', error);
  }

  return {
    defaultImages: [],
    colorImages: {},
  };
};

export const getFallbackImages = (payload: ProductImagePayload): string[] => {
  if (payload.defaultImages.length > 0) {
    return payload.defaultImages;
  }

  const firstColorImages = Object.values(payload.colorImages).find(
    (images) => images.length > 0,
  );

  return firstColorImages || [];
};
