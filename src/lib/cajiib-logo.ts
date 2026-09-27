/**
 * The Cajiib Creative mark (a blue "C" with six sun rays), traced from the
 * brand file. One definition draws it everywhere: the footer credit
 * (animated SVG), the PDF footer (pdf-lib) and emails.
 */

export const CAJIIB = {
  name: "Cajiib Creative",
  url: "https://cajiibcreative.mrk.so/",
  host: "cajiibcreative.mrk.so",
  blue: "#0F75BB",
  orange: "#FCB041",
} as const

/** Coordinates in the traced artwork's own units. */
export const CAJIIB_VIEWBOX = { x: 0, y: 40, width: 1840, height: 1560 }

/** The "C": outer arc, the swept top terminal, inner arc, bottom terminal. */
export const CAJIIB_C_PATH =
  "M1587 843 A513 513 0 1 0 1587 1267 L1557 1267 C1470 1267 1392 1298 1318 1360 " +
  "A344 369 0 1 1 1318 750 C1392 812 1470 843 1557 843 Z"

/** The rays, as round-capped strokes from the C outwards. */
export const CAJIIB_RAYS: readonly (readonly [number, number, number, number])[] = [
  [514, 1022, 60, 1027],
  [597, 718, 385, 672],
  [802, 522, 665, 126],
  [1120, 427, 1120, 220],
  [1385, 508, 1676, 117],
  [1620, 683, 1771, 532],
]

export const CAJIIB_RAY_WIDTH = 88

/** Centre of the C, the origin the rays burst from in the animation. */
export const CAJIIB_CENTER = { x: 1120, y: 1054 }
