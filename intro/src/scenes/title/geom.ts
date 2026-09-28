// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Static silhouette geometry for the title backdrop: the old church, the
// graveyard, the ruined arch and the dead tree. Frame space, 1920x1080.

import {rand} from '../../lib/fx';

const poly = (pts: number[][]) => 'M' + pts.map((p) => p.join(',')).join('L') + 'Z';

/** Pointed (lancet) arch opening: x0..x1, springing at ys, apex at ya, sill at yb. */
export const lancet = (x0: number, x1: number, ya: number, ys: number, yb: number) => {
  const w = x1 - x0;
  return `M${x0},${yb}L${x0},${ys}Q${x0},${ya + (ys - ya) * 0.25} ${x0 + w / 2},${ya}Q${x1},${
    ya + (ys - ya) * 0.25
  } ${x1},${ys}L${x1},${yb}Z`;
};

// Church, facade-on, tower in the middle. Ground line ~792.
export const churchBody = [
  // Aisles, the right one fallen in.
  poly([[688, 800], [688, 690], [780, 642], [780, 800]]),
  poly([[1140, 800], [1140, 642], [1160, 654], [1167, 676], [1178, 664], [1190, 694], [1204, 686], [1214, 704], [1232, 706], [1232, 800]]),
  // Nave gable.
  poly([[780, 800], [780, 612], [960, 476], [1140, 612], [1140, 800]]),
  // Buttresses with pinnacles.
  poly([[768, 800], [768, 566], [780, 526], [792, 566], [792, 800]]),
  poly([[1128, 800], [1128, 566], [1140, 526], [1152, 566], [1152, 800]]),
  poly([[682, 800], [682, 668], [690, 642], [698, 668], [698, 800]]),
  // Tower, cornice, pinnacles, spire and finial.
  poly([[905, 800], [905, 330], [1015, 330], [1015, 800]]),
  poly([[898, 331], [898, 321], [1022, 321], [1022, 331]]),
  poly([[899, 322], [905, 276], [911, 322]]),
  poly([[1009, 322], [1015, 276], [1021, 322]]),
  poly([[912, 322], [960, 152], [1008, 322]]),
  poly([[958.6, 154], [959.4, 136], [960.8, 136], [961.4, 154]]),
  poly([[953, 143], [953, 141], [967, 140.5], [967, 142.5]]),
].join('');

/** Openings that bleed red light from inside the church. */
export const churchWindows: {d: string; cx: number; cy: number; r: number; hot: number}[] = [
  {d: lancet(936, 984, 708, 736, 800), cx: 960, cy: 772, r: 80, hot: 1},
  {d: lancet(820, 838, 736, 750, 790), cx: 829, cy: 764, r: 30, hot: 0.5},
  {d: lancet(1082, 1100, 736, 750, 790), cx: 1091, cy: 764, r: 30, hot: 0.65},
  {d: lancet(724, 738, 730, 742, 782), cx: 731, cy: 758, r: 22, hot: 0.3},
  {d: lancet(1182, 1196, 734, 746, 782), cx: 1189, cy: 760, r: 28, hot: 0.8},
];

// The hill the church stands on, and the nearer graveyard rise.
export const farHill =
  'M-40,812 C220,796 520,784 760,790 C900,793 1020,793 1160,790 C1420,784 1700,800 1960,818 L1960,1100 L-40,1100 Z';
export const midHill =
  'M-40,850 C200,828 430,826 640,842 C780,852 860,858 960,858 C1080,858 1180,846 1320,838 C1540,826 1760,834 1960,852 L1960,1100 L-40,1100 Z';
export const nearMound =
  'M-40,905 C180,880 420,896 640,918 C800,932 1120,932 1300,918 C1520,898 1760,884 1960,900 L1960,1100 L-40,1100 Z';

/** Grave markers on the graveyard rise: crosses and rounded stones, some leaning. */
export const graves = (() => {
  const out: string[] = [];
  const spots = [
    [470, 836, 1], [522, 834, 0], [566, 838, 1], [612, 842, 0], [668, 848, 1], [712, 852, 0],
    [1238, 846, 0], [1282, 842, 1], [1330, 838, 0], [1382, 834, 1], [1430, 832, 0], [1478, 830, 1],
  ];
  spots.forEach(([x, y, cross], i) => {
    const s = `grave-${i}`;
    const h = rand(s + 'h', 22, 40);
    const lean = rand(s + 'l', -14, 14);
    const tr = `rotate(${lean} ${x} ${y})`;
    if (cross) {
      const w = h * 0.12;
      const arm = h * 0.34;
      out.push(
        `<g transform="${tr}"><rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h + 6}"/>` +
          `<rect x="${x - arm}" y="${y - h * 0.74}" width="${arm * 2}" height="${w}"/></g>`,
      );
    } else {
      const w = h * 0.55;
      out.push(
        `<path transform="${tr}" d="M${x - w / 2},${y + 6}L${x - w / 2},${y - h + w / 2}A${w / 2},${w / 2} 0 0 1 ${
          x + w / 2
        },${y - h + w / 2}L${x + w / 2},${y + 6}Z"/>`,
      );
    }
  });
  return out.join('');
})();

/** A ruined chapel wall with an empty lancet, and a lone broken pier. Mid-ground right. */
export const ruin = [
  // Wall: jagged broken top, a tall window hole cut through (even-odd).
  'M1560,884 L1560,700 L1572,690 L1578,640 L1592,628 L1600,596 L1612,590 L1622,556 L1636,548 L1646,566 ' +
    'L1660,560 L1668,590 L1684,598 L1692,626 L1706,630 L1712,662 L1726,672 L1734,700 L1748,712 L1752,760 ' +
    'L1764,772 L1768,884 Z ' +
    lancet(1630, 1690, 624, 662, 770),
  // Buttress stub on the wall's left.
  'M1540,884 L1540,760 L1550,742 L1562,742 L1562,884 Z',
  // The lone pier, capital half gone.
  'M1826,884 L1826,690 L1820,684 L1820,670 L1858,666 L1862,676 L1854,684 L1854,884 Z',
  'M1826,670 L1830,640 L1840,652 L1846,634 L1852,666 Z',
  // Rubble.
  'M1768,884 L1768,856 L1782,848 L1796,860 L1810,852 L1826,862 L1826,884 Z',
  'M1500,884 L1508,868 L1524,864 L1540,872 L1540,884 Z',
].join('');

export type Branch = {x1: number; y1: number; x2: number; y2: number; w: number; depth: number; phase: number};

/** A gnarled dead tree, grown recursively with a fixed seed. */
export const deadTree = (() => {
  const out: Branch[] = [];
  const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number, seed: string) => {
    // Crooked: each limb is two kinked segments.
    const kink = rand(seed + 'k', -0.35, 0.35);
    const mx = x + Math.cos(ang) * len * 0.5;
    const my = y + Math.sin(ang) * len * 0.5;
    const a2 = ang + kink;
    const ex = mx + Math.cos(a2) * len * 0.5;
    const ey = my + Math.sin(a2) * len * 0.5;
    const phase = rand(seed + 'ph', 0, 100);
    out.push({x1: x, y1: y, x2: mx, y2: my, w, depth, phase});
    out.push({x1: mx, y1: my, x2: ex, y2: ey, w: w * 0.85, depth, phase});
    if (depth >= 5 || len < 14) return;
    const kids = depth < 2 ? 2 : rand(seed + 'n', 0, 1) < 0.5 ? 2 : 3;
    for (let i = 0; i < kids; i++) {
      const s = `${seed}-${i}`;
      const spread = rand(s + 'a', 0.35, 0.8) * (i % 2 === 0 ? -1 : 1);
      // Branches bias upward-and-out, a little toward the church.
      const na = a2 + spread + (depth === 0 ? 0 : rand(s + 'b', -0.2, 0.2));
      grow(ex, ey, na, len * rand(s + 'l', 0.62, 0.8), w * 0.62, depth + 1, s);
    }
  };
  grow(300, 872, -Math.PI / 2 - 0.12, 150, 26, 0, 'tree');
  return out;
})();
