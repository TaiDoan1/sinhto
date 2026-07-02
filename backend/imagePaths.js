/** Đồng bộ với src/app/config/images.ts — mọi ảnh trong public/images/ */
const IMAGES_ROOT = '/images';
const UPLOADS_PREFIX = `${IMAGES_ROOT}/uploads`;

const PRODUCT = {
  strawberry: `${IMAGES_ROOT}/strawberry_smoothie.png`,
  mango: `${IMAGES_ROOT}/mango_smoothie.png`,
  cacaoOat: `${IMAGES_ROOT}/cacao_oat_smoothie.png`,
  hero: `${IMAGES_ROOT}/fitblend_hero_smoothie.png`,
  combo: `${IMAGES_ROOT}/fitblend_combo_bottles.png`,
};

module.exports = { IMAGES_ROOT, UPLOADS_PREFIX, PRODUCT };
