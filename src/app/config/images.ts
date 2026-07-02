/**
 * Mọi ảnh tĩnh & upload của dự án — file vật lý nằm trong `public/images/`.
 * Ảnh admin upload qua API → `public/images/uploads/`.
 */
export const IMAGES_ROOT = '/images';
export const UPLOADS_PREFIX = `${IMAGES_ROOT}/uploads`;

export const PRODUCT_IMAGES = {
  strawberry: `${IMAGES_ROOT}/strawberry_smoothie.png`,
  mango: `${IMAGES_ROOT}/mango_smoothie.png`,
  cacaoOat: `${IMAGES_ROOT}/cacao_oat_smoothie.png`,
  hero: `${IMAGES_ROOT}/fitblend_hero_smoothie.png`,
  combo: `${IMAGES_ROOT}/fitblend_combo_bottles.png`,
} as const;

export const LANDING_IMAGES = {
  heroSmoothie: PRODUCT_IMAGES.hero,
  comboBottles: PRODUCT_IMAGES.combo,
  menuPage: (page: number) => `${IMAGES_ROOT}/menu${page}.jpg`,
} as const;

export const PRODUCT_EMOJI_OPTIONS = [
  { path: '🍓', label: 'Dâu Tây (Emoji)' },
  { path: '🥭', label: 'Xoài (Emoji)' },
  { path: '🥑', label: 'Bơ (Emoji)' },
  { path: '🍌', label: 'Chuối (Emoji)' },
  { path: '🍫', label: 'Cacao (Emoji)' },
  { path: '🥛', label: 'Sữa (Emoji)' },
  { path: '✨', label: 'Topping (Emoji)' },
  { path: '📦', label: 'Combo (Emoji)' },
] as const;

export const PRODUCT_FILE_OPTIONS = [
  { path: PRODUCT_IMAGES.strawberry, label: 'Hình ảnh Dâu Tây' },
  { path: PRODUCT_IMAGES.mango, label: 'Hình ảnh Xoài/Nhiệt đới' },
  { path: PRODUCT_IMAGES.cacaoOat, label: 'Hình ảnh Cacao/Cà phê' },
  { path: PRODUCT_IMAGES.hero, label: 'Hình ảnh Bơ/Matcha' },
  { path: PRODUCT_IMAGES.combo, label: 'Hình ảnh Combo/Chai' },
] as const;

export const PRODUCT_IMAGE_PICKER_OPTIONS = [
  ...PRODUCT_EMOJI_OPTIONS,
  ...PRODUCT_FILE_OPTIONS,
];

/** POS — không có emoji, chỉ file ảnh */
export const POS_PRODUCT_IMAGE_OPTIONS = PRODUCT_FILE_OPTIONS.map(({ path, label }) => ({
  path,
  label: label.replace('Hình ảnh ', ''),
}));

export function isUploadedImage(url: string): boolean {
  return url.startsWith(UPLOADS_PREFIX) || url.startsWith('/uploads/');
}

/** Chuẩn hóa URL cũ `/uploads/...` → `/images/uploads/...` */
export function normalizeImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/uploads/')) {
    return `${UPLOADS_PREFIX}/${url.slice('/uploads/'.length)}`;
  }
  return url;
}
