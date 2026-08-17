// Photos for the "Photos" galleries on the homepage and the event detail pages.
// The gallery is a horizontally-scrolling row of fixed-height tiles; each tile
// derives its width from the file's intrinsic size so nothing is cropped or
// stretched. Keep width/height in sync with the actual files in
// public/img/past_events/ (the names encode the row they came from in Figma).

export interface GalleryPhoto {
  src: string;
  width: number;
  height: number;
}

export const galleryPhotos: GalleryPhoto[] = [
  { src: '/img/past_events/photo_row_1_1.webp', width: 611, height: 452 },
  { src: '/img/past_events/photo_row_1_2.webp', width: 611, height: 452 },
  { src: '/img/past_events/photo_row_1_3.webp', width: 460, height: 452 },
  { src: '/img/past_events/photo_row_1_4.webp', width: 761, height: 452 },
  { src: '/img/past_events/photo_row_2_1.webp', width: 459, height: 621 },
  { src: '/img/past_events/photo_row_2_2.webp', width: 610, height: 621 },
  { src: '/img/past_events/photo_row_2_3.webp', width: 761, height: 621 },
  { src: '/img/past_events/photo_row_2_4.webp', width: 610, height: 621 },
  { src: '/img/past_events/photo_row_3_1.webp', width: 611, height: 452 },
  { src: '/img/past_events/photo_row_3_2.webp', width: 460, height: 452 },
  { src: '/img/past_events/photo_row_3_3.webp', width: 611, height: 452 },
  { src: '/img/past_events/photo_row_3_4.webp', width: 761, height: 452 },
];

// PhotoLightbox takes a plain string[].
export const galleryPhotoSrcs: string[] = galleryPhotos.map((p) => p.src);

// Height (px) the gallery tiles render at on desktop, matching md:h-[384px].
const TILE_HEIGHT = 384;

// Width a tile needs at TILE_HEIGHT to keep the photo's aspect ratio. Fed to the
// tile as a --tile-w CSS variable so the mobile full-bleed width still wins
// below the md breakpoint (an inline width would override the class).
export function tileWidth(photo: GalleryPhoto): number {
  return Math.round((TILE_HEIGHT * photo.width) / photo.height);
}
