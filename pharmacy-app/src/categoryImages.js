// Free-to-use photos (Unsplash License — no attribution required, but we
// credit anyway, see PHOTO_CREDITS). They load straight from Unsplash's CDN;
// if one ever fails to load the tile/banner just shows its colour gradient.
//
// To swap one, put your own image in public/img/ and use "/img/yours.jpg".
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70`;

// Keyed by shelf id (see api/_concerns.js). Shelves without a photo simply
// use the gradient + icon.
export const CATEGORY_PHOTOS = {
  skin: U("1552046122-03184de85e08"),
  dental: U("1550985543-f1ea83691cd8"),
  diabetes: U("1683727186226-910f31a9da45"),
  vitamins: U("1734607402878-eeb4233cea86"),
  surgical: U("1765996796562-ce301df337a0"),
  sexual: U("1495653797063-114787b77b23"),
  heart: U("1655313719493-16ebe4906441"),
  women: U("1538678867871-8a43e7487746"),
  baby: U("1582486225644-aeacf6aa0b1b"),
  other: U("1577401132921-cb39bb0adcff"),
};

export const BANNER_PHOTOS = {
  pharmacy: U("1580281657527-47f249e8f4df"),
  pills: U("1471864190281-a93a3070b6de"),
  ...CATEGORY_PHOTOS,
};

export const PHOTO_CREDITS =
  "Photos via Unsplash — freestocks, William Warby, Sweet Life, Shruti Mishra, Navy Medicine, Roman Kraft, Etactics, Nathan Dumlao, National Cancer Institute, Devon Divine, Toa Heftiba, Volodymyr Hryshchenko.";
