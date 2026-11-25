// Two independent rotations describe all 25 complete rosters. A path walks
// clockwise through the ending person, leaving its starting person behind.
const cast = ['Dex','Ivo','Luma','Mira','Nia','Orin','Pia','Sol','Tess','Vale'];
const duties = ['friend','foe','spy','double','civilian','foreigner'];
const labels = {friend:'Friend',foe:'Foe',spy:'Spy',double:'Double agent',civilian:'Civilian',foreigner:'Foreigner'};
const offsets = [0,1,2,3,4];
const worlds = Array.from({length:25}, (_,i) => i);
const offset = (world,crew) => crew === 0 ? world % 5 : Math.floor(world / 5);
const bothChanged = (a,b) => a % 5 !== b % 5 && Math.floor(a / 5) !== Math.floor(b / 5);
const join = pair => pair.join(' and ');
function shuffle(items,draw) {
  const result = [...items];
  for (let i = result.length-1; i > 0; i--) {
    const j = Math.floor(draw()*(i+1));
    [result[i],result[j]] = [result[j],result[i]];
  }
  return result;
}
function visitedMask(crew, path) {
  const start = crew.names.indexOf(path.from);
  const end = crew.names.indexOf(path.to);
  const station = crew.stations.findIndex(roles => roles.includes(path.role));
  if (start < 0 || end < 0 || start === end || station < 0) return 0;
  let mask = 0;
  for (let i = (start + 1) % 5; ; i = (i + 1) % 5) {
    mask |= 1 << ((i - station + 5) % 5);
    if (i === end) return mask;
  }
}
function compile(board, withChanges = false) {
  const rows = board.reports.map(({paths}) => paths.map((path,c) => {
    const crew = board.crews[c];
    const mask = visitedMask(crew,path);
    const changes = [];
    if (withChanges) {
      for (const field of ['from','to','role']) {
        const choices = field === 'role' ? duties : crew.names;
        for (const value of choices) {
          if (value === path[field]) continue;
          const changed = visitedMask(crew,{...path,[field]:value});
          if (changed && changed !== mask) changes.push({token:path[field],diff:mask ^ changed});
        }
      }
    }
    return {mask,changes};
  }));
  // Each bit records whether the TWO local witnesses agree on that row.
  const signatures = worlds.map(w => rows.reduce((signature,row,i) => {
    const left = (row[0].mask >> offset(w,0)) & 1;
    const right = (row[1].mask >> offset(w,1)) & 1;
    return signature | (Number(left === right) << i);
  },0));
  return {rows,signatures};
}
function memberAt(crew,station,rotation) {
  return crew.names[(station + rotation) % 5];
}
function doublePair(board,w) {
  return board.crews.map((crew,c) =>
    memberAt(crew,crew.stations.findIndex(roles => roles.length === 2),offset(w,c)));
}
function commandCode(reports) {
  return reports.reduce((signature,r,i) => signature | (Number(r.same) << i),0);
}
function lineup(board) {
  const {signatures} = compile(board);
  const visible = commandCode(board.reports);
  return worlds.filter(w => signatures[w] === visible);
}
function previousWorld(board) {
  const old = board.previousPair ?? [];
  if (old.length !== 2) return -1;
  return worlds.find(w => doublePair(board,w).every(name => old.includes(name))) ?? -1;
}
export function caseRoles(board) {
  const result = Object.fromEntries(duties.map(role => [role,[]]));
  const matches = lineup(board);
  if (matches.length !== 1) return result;
  board.crews.forEach((crew,c) => crew.stations.forEach((roles,s) => {
    const name = memberAt(crew,s,offset(matches[0],c));
    roles.forEach(role => result[role].push(name));
  }));
  return result;
}
export function possibleDutyPairs(board,omitIndex) {
  const {signatures} = compile(board);
  const visible = commandCode(board.reports);
  const ignore = Number.isInteger(omitIndex) && omitIndex >= 0 && omitIndex < board.reports.length
    ? 1 << omitIndex : 0;
  const old = previousWorld(board);
  return worlds.filter(w => w !== old && !((signatures[w] ^ visible) & ~ignore)).map(w => doublePair(board,w));
}
function explain(board, compiled, winner) {
  const {rows,signatures} = compiled;
  const signature = signatures[winner];
  const last = rows.length - 1;
  const others = worlds.filter(w => bothChanged(w,winner) && w !== previousWorld(board) &&
    signatures[w] === (signature ^ (1 << last)));
  const proof = [];
  if (others.length) {
    const alternate = others[0];
    const count = worlds.filter(w => !((signatures[w] ^ signature) & ((1 << last)-1))).length;
    proof.push('The first ' + last + ' reports leave ' + count + ' possible double-duty pairs, including ' +
      join(doublePair(board,alternate)) + '.');
    const compare = w => board.reports[last].paths.map((p,c) => {
      const passed = (rows[last][c].mask >> offset(w,c)) & 1;
      const crew = board.crews[c];
      const holder = memberAt(crew,crew.stations.findIndex(rs => rs.includes(p.role)),offset(w,c));
      return p.from + ' → ' + p.to + (passed ? ' passes ' : ' misses ') + holder + ' (' + labels[p.role] + ')';
    }).join(', while ');
    proof.push('If ' + join(doublePair(board,alternate)) + ' were on double duty, ' + compare(alternate) +
      '. That contradicts report ' + (last+1) + '.');
    proof.push('With ' + join(doublePair(board,winner)) + ' on double duty, ' + compare(winner) +
      '. That matches the report.');
  }
  proof.push(board.crews.map((crew,c) => {
    const station = crew.stations.findIndex(roles => roles.length === 2);
    return memberAt(crew,station,offset(winner,c)) + ' covers ' + join(crew.stations[station].map(r=>labels[r]));
  }).join('. ') + '.');
  return proof;
}
export function solveDutyTrial(board) {
  const compiled = compile(board);
  const signature = commandCode(board.reports);
  const exact = worlds.filter(w => compiled.signatures[w] === signature);
  if (exact.length !== 1) return {pair:[],proof:[]};
  return {pair:doublePair(board,exact[0]),proof:explain(board,compiled,exact[0])};
}

function certifiedWorlds(board) {
  const {rows,signatures} = compile(board,true);
  const old = previousWorld(board);
  const good = [];
  for (const w of worlds) {
    if (w === old || signatures.some((s,u) => u !== w && s === signatures[w])) continue;
    const sensitive = new Set();
    let everyReport = true;
    for (const [i,row] of rows.entries()) {
      const opposite = signatures[w] ^ (1 << i);
      const alternatives = worlds.filter(u => u !== old && bothChanged(u,w) && signatures[u] === opposite);
      if (!alternatives.length) { everyReport = false; break; }
      // Alter precisely one named endpoint or watched duty on this path.
      // The same printed signs must then admit two different names while
      // every unedited endpoint, watched duty and wheel stays fixed.
      row.forEach((arm,c) => {
        for (const {token,diff} of arm.changes) {
          if (alternatives.some(u => diff & (1 << offset(u,c)))) sensitive.add(token);
        }
      });
    }
    if (everyReport && sensitive.size === 16) good.push(w);
  }
  // Keep this guarantee even for someone who knows the selection rules:
  // after reading ANY one chosen sign, an answer changing BOTH people must
  // still exist among worlds the generator could actually select.
  let viable = good;
  while (viable.length) {
    const next = viable.filter(w => rows.every((_,i) => viable.some(u =>
      bothChanged(u,w) && !((signatures[w] ^ signatures[u]) & (1 << i)))));
    if (next.length === viable.length) return next;
    viable = next;
  }
  return viable;
}

function crewStations(doubleRoles,draw) {
  return shuffle([doubleRoles,...duties.filter(r=>!doubleRoles.includes(r)).map(r=>[r])],draw);
}
function randomPaths(names,roles,draw) {
  const path = roles.map(role => {
    const start = Math.floor(draw()*5);
    const length = draw() < .8 ? (draw() < .5 ? 2 : 3) : (draw() < .5 ? 1 : 4);
    return {from:names[start],to:names[(start+length)%5],role};
  });
  return new Set(path.flatMap(p=>[p.from,p.to])).size === 5 ? path : null;
}
function randomBoard(names,draw) {
  const roleOrder = shuffle(duties,draw);
  const crews = [0,1].map(c => ({names:names.slice(c*5,c*5+5),
    stations:crewStations(roleOrder.slice(c*2,c*2+2),draw)}));
  const first = shuffle(duties,draw).slice(0,4);
  const second = shuffle([...duties.filter(r=>!first.includes(r)),...shuffle(first,draw).slice(0,2)],draw);
  const paths = [randomPaths(crews[0].names,first,draw),randomPaths(crews[1].names,second,draw)];
  if (!paths[0] || !paths[1]) return null;
  const reports = first.map((_,i)=>({paths:[paths[0][i],paths[1][i]],same:false}));
  return {crews,reports};
}
function makeDraw(random,number) {
  let seed = (Math.floor(random()*4294967296) ^ Math.imul(number,0x9e3779b1)) >>> 0;
  return () => {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function finish(board,w,draw) {
  // Shuffling the four independent rows also changes which competing
  // alignment is walked through in the debrief.
  const {signatures} = compile(board);
  const reports = shuffle(board.reports.map((r,i)=>({...r,same:!!(signatures[w] & (1 << i))})),draw);
  const trial = {...board,reports,roster:cast.slice(),order:'Shoot whoever holds two roles.'};
  return {...trial,...solveDutyTrial(trial)};
}
// A row stores a base-frame seed followed by independently certified route
// variations. Reconstructing one avoids an open-ended search on phones.
const frameLibrary = [
  [55920, 201, 591, 1041, 1204, 1360, 1661, 2075, 2255, 2531, 2903, 3226, 3453],
  [254924, 149, 248, 819, 963, 1073, 1089, 1286, 1370, 1435, 1778, 1800, 1841],
  [1024703, 26, 101, 244, 471, 547, 907, 1144, 1315, 1551, 1719, 1750, 2748],
  [1472602, 149, 248, 819, 963, 1073, 1089, 1286, 1370, 1435, 1778, 1800, 1841],
  [1576624, 149, 231, 379, 854, 963, 1089, 1130, 1251, 1286, 1302, 1435, 1752],
  [1808222, 137, 380, 517, 774, 877, 1581, 1964, 2050, 2111, 2172, 2507, 2515],
  [2059376, 8, 19, 83, 468, 593, 1402, 1592, 1675, 2011, 2032, 2245, 2417],
  [2576420, 300, 745, 976, 1070, 1676, 1700, 1921, 1925, 2462, 2629, 3257, 3305],
  [2966231, 39, 263, 798, 957, 1104, 1347, 1471, 1530, 1544, 1618, 1641, 1711],
  [3090890, 543, 1129, 1220, 1509, 1638, 1790, 1871, 1898, 1912, 1967, 2284, 2485],
  [3155811, 182, 304, 437, 525, 560, 801, 862, 907, 1604, 1857, 1931, 2535],
  [3289194, 725, 876, 1529, 1626, 1734, 1812, 1969, 2129, 2250, 2396, 2482, 2766],
  [4014712, 161, 682, 811, 953, 1306, 1611, 1755, 2177, 2210, 2438, 2467, 2578],
  [4252107, 210, 322, 628, 631, 1027, 1293, 2545, 2823, 2898, 3407, 3436, 3486],
  [4338164, 223, 277, 359, 527, 844, 1626, 1844, 1864, 2139, 2396, 2596, 2746],
  [4491628, 223, 277, 359, 527, 844, 1626, 1844, 1864, 2139, 2396, 2596, 2746],
  [5104774, 289, 443, 749, 1112, 1394, 1466, 1577, 1793, 2279, 2375, 2982, 3011],
  [5227415, 26, 101, 244, 471, 547, 907, 1144, 1315, 1551, 1719, 1750, 2748],
  [5549255, 149, 248, 819, 963, 1073, 1089, 1286, 1370, 1435, 1778, 1800, 1841],
  [5605098, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [5743141, 410, 496, 502, 716, 749, 857, 1577, 1746, 1940, 2055, 2387, 2668],
  [5751752, 22, 314, 358, 476, 1009, 1113, 1307, 1597, 1619, 1628, 1659, 2120],
  [5812209, 25, 423, 515, 616, 822, 1579, 2369, 2411, 2608, 3017, 3194, 3368],
  [6198958, 137, 380, 517, 774, 877, 1581, 1964, 2050, 2111, 2172, 2507, 2515],
  [6273027, 10, 79, 343, 785, 1697, 2183, 2295, 2476, 2735, 2888, 2930, 3060],
  [6688175, 32, 286, 452, 477, 869, 1111, 1119, 1637, 2502, 2597, 2908, 3515],
  [6729241, 324, 479, 750, 889, 1378, 1646, 1961, 1971, 2801, 3781, 3816, 3862],
  [6829982, 55, 120, 160, 182, 406, 860, 933, 1163, 1600, 1691, 2099, 2156],
  [7236672, 859, 1087, 1247, 1381, 1405, 1410, 1933, 2028, 2699, 3045, 3135, 3331],
  [7527889, 37, 49, 97, 421, 586, 902, 2419, 2486, 2601, 3240, 3317, 4368],
  [7799776, 300, 745, 976, 1070, 1676, 1700, 1921, 1925, 2462, 2629, 3257, 3305],
  [7958359, 96, 323, 327, 643, 655, 966, 1878, 1939, 2807, 3027, 3660, 3963],
  [8014313, 32, 286, 452, 477, 869, 1111, 1119, 1637, 2502, 2597, 2908, 3515],
  [8060538, 305, 376, 469, 615, 885, 1059, 1092, 1318, 1448, 2193, 2655, 2689],
  [8097585, 149, 231, 379, 854, 963, 1089, 1130, 1251, 1286, 1302, 1435, 1752],
  [8341358, 289, 443, 749, 1112, 1394, 1466, 1577, 1793, 2279, 2375, 2982, 3011],
  [8409597, 26, 101, 244, 471, 547, 907, 1144, 1315, 1551, 1719, 1750, 2748],
  [8584453, 347, 666, 1000, 1056, 1101, 1545, 2309, 2477, 2853, 3010, 3202, 3535],
  [8752979, 54, 161, 682, 1045, 1187, 1226, 1425, 1560, 1789, 1847, 1906, 2234],
  [9221747, 597, 1132, 1225, 1491, 1532, 1629, 1692, 1785, 1795, 2260, 2966, 3071],
  [9466653, 198, 324, 341, 848, 889, 1279, 1961, 1971, 2996, 3586, 3816, 4441],
  [9652712, 96, 323, 327, 643, 655, 966, 1878, 1939, 2807, 3027, 3660, 3963],
  [9728869, 684, 764, 1186, 1712, 1768, 1869, 2037, 2051, 2197, 2233, 2454, 2714],
  [10187336, 289, 443, 749, 1112, 1394, 1466, 1577, 1793, 2279, 2375, 2982, 3011],
  [10367590, 274, 454, 1182, 1209, 1289, 1362, 1367, 1872, 2030, 2160, 2695, 2720],
  [10417041, 410, 496, 502, 716, 749, 857, 1577, 1746, 1940, 2055, 2387, 2668],
  [10693939, 419, 432, 609, 661, 703, 706, 1080, 1355, 1666, 1723, 2133, 2207],
  [11109538, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [11260811, 59, 129, 1355, 1502, 1805, 1923, 2004, 2136, 2212, 2229, 2367, 3046],
  [11499425, 67, 458, 775, 1026, 1390, 1431, 1461, 1489, 1679, 2205, 2394, 2771],
  [11614438, 67, 458, 775, 1026, 1390, 1431, 1461, 1489, 1679, 2205, 2394, 2771],
  [11685298, 753, 774, 820, 904, 956, 1141, 1548, 1948, 1964, 2005, 2050, 2085],
  [11711340, 300, 745, 976, 1070, 1676, 1700, 1921, 1925, 2462, 2629, 3257, 3305],
  [11793468, 26, 101, 244, 471, 547, 907, 1144, 1315, 1551, 1719, 1750, 2748],
  [12257556, 98, 150, 627, 867, 899, 1179, 1274, 1658, 2391, 2839, 3393, 3857],
  [12265948, 419, 432, 609, 661, 703, 706, 1080, 1355, 1666, 1723, 2133, 2207],
  [13192755, 149, 248, 819, 963, 1073, 1089, 1286, 1370, 1435, 1778, 1800, 1841],
  [13232659, 381, 400, 988, 1022, 1029, 1088, 1250, 1296, 1393, 1432, 1580, 1997],
  [13729715, 234, 251, 482, 674, 707, 1063, 1172, 1200, 1712, 1799, 1869, 2479],
  [13904592, 71, 129, 400, 906, 1213, 1250, 1393, 1797, 1870, 1889, 1997, 2602],
  [13992682, 381, 400, 988, 1022, 1029, 1088, 1250, 1296, 1393, 1432, 1580, 1997],
  [14444606, 252, 413, 659, 1044, 1281, 1518, 2179, 2381, 2413, 2659, 2770, 2941],
  [15213417, 259, 269, 490, 519, 544, 871, 1037, 2455, 2464, 2576, 2673, 2826],
  [15398679, 390, 982, 1219, 1429, 1621, 1636, 2069, 2867, 2931, 3016, 3689],
  [15699084, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [15835676, 981, 986, 1170, 1866, 2221, 2544, 2679, 3085, 3096, 3459, 3784],
  [15881962, 5, 58, 169, 924, 1295, 2201, 2519, 2918, 3429, 3533, 3772, 4298],
  [16352230, 19, 468, 593, 787, 1359, 1589, 2032, 2399, 2447, 2541, 2574, 2614],
  [16800533, 54, 161, 682, 1045, 1187, 1226, 1425, 1560, 1789, 1847, 1906, 2234],
  [17216952, 39, 263, 798, 957, 1104, 1347, 1471, 1530, 1544, 1618, 1641, 1711],
  [17302169, 283, 301, 569, 672, 687, 1265, 1578, 2026, 2267, 2806, 2962, 2974],
  [17877797, 8, 19, 83, 468, 593, 1402, 1592, 1675, 2011, 2032, 2245, 2417],
  [17967177, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [18024516, 15, 40, 569, 598, 943, 1227, 1265, 1741, 2181, 2267, 2334, 2609],
  [18080067, 167, 229, 337, 935, 939, 1494, 1542, 1786, 1918, 1994, 2301, 2683],
  [18267942, 221, 298, 658, 873, 1222, 1380, 1423, 2169, 2421, 2463, 2497, 3245],
  [19446511, 22, 107, 358, 466, 590, 1333, 1392, 1598, 2120, 2275, 2281, 2656],
  [19622962, 32, 286, 452, 477, 869, 1111, 1119, 1637, 2502, 2597, 2908, 3515],
  [20087130, 209, 812, 1475, 1528, 1633, 1772, 1815, 1895, 1926, 2105, 2292, 2532],
  [20224631, 36, 146, 793, 930, 1196, 1450, 1508, 1671, 2045, 2128, 2140, 2191],
  [20269395, 324, 479, 750, 889, 1378, 1646, 1961, 1971, 2801, 3781, 3816, 3862],
  [20554324, 302, 469, 494, 769, 776, 912, 945, 948, 1085, 1164, 1959, 1987],
  [20683721, 455, 559, 935, 939, 1051, 1183, 1385, 2469, 2518, 2676, 2718, 2753],
  [20752074, 124, 245, 760, 1136, 1231, 1413, 1725, 1876, 2057, 2242, 2672, 3042],
  [21004401, 289, 443, 749, 1112, 1394, 1466, 1577, 1793, 2279, 2375, 2982, 3011],
  [21219987, 223, 277, 359, 527, 844, 1626, 1844, 1864, 2139, 2396, 2596, 2746],
  [21534791, 182, 304, 437, 525, 560, 801, 862, 907, 1604, 1857, 1931, 2535],
  [22274471, 210, 322, 628, 631, 1027, 1293, 2545, 2823, 2898, 3407, 3436, 3486],
  [22306031, 684, 764, 1186, 1712, 1768, 1869, 2037, 2051, 2197, 2233, 2454, 2714],
  [22340666, 134, 281, 567, 808, 867, 1018, 1100, 1555, 1859, 2002, 2078, 2230],
  [22619392, 59, 129, 1355, 1502, 1805, 1923, 2004, 2136, 2212, 2229, 2367, 3046],
  [23048433, 26, 101, 244, 471, 547, 907, 1144, 1315, 1551, 1719, 1750, 2748],
  [23098155, 7, 75, 320, 448, 595, 1121, 1468, 1632, 1880, 1934, 2190, 2356],
  [23356965, 775, 810, 1277, 1340, 1345, 1682, 2797, 3065, 3395, 3663, 3741, 3794],
  [23823828, 241, 420, 568, 724, 909, 1044, 2130, 2176, 2397, 2707, 2752, 3386],
  [23964580, 259, 269, 490, 519, 544, 871, 1037, 2455, 2464, 2576, 2673, 2826],
  [23991000, 55, 350, 406, 839, 900, 1224, 1330, 1702, 2023, 2156, 2327, 3047],
  [24168622, 269, 325, 685, 1905, 2064, 2142, 2336, 2455, 2968, 3697, 3807, 4112],
  [24946867, 597, 1132, 1225, 1491, 1532, 1629, 1692, 1785, 1795, 2260, 2966, 3071],
  [25715381, 859, 1087, 1247, 1381, 1405, 1410, 1933, 2028, 2699, 3045, 3135, 3331],
  [25739039, 13, 17, 193, 253, 1188, 1989, 2066, 2190, 2308, 2737, 2945, 3153],
  [26217306, 202, 235, 539, 670, 793, 1352, 1975, 2412, 3271, 3366, 3470, 3630],
  [26232068, 775, 810, 1277, 1340, 1345, 1682, 2797, 3065, 3395, 3663, 3741, 3794],
  [26338459, 26, 101, 244, 471, 547, 907, 1144, 1315, 1551, 1719, 1750, 2748],
  [26528587, 259, 269, 490, 519, 544, 871, 1037, 2455, 2464, 2576, 2673, 2826],
  [27225042, 149, 231, 379, 854, 963, 1089, 1130, 1251, 1286, 1302, 1435, 1752],
  [27519994, 183, 456, 534, 689, 1086, 1098, 1283, 1419, 1851, 2042, 2410, 2513],
  [27540954, 775, 810, 1277, 1340, 1345, 1682, 2797, 3065, 3395, 3663, 3741, 3794],
  [28116362, 305, 376, 469, 615, 885, 1059, 1092, 1318, 1448, 2193, 2655, 2689],
  [28291851, 161, 682, 811, 953, 1306, 1611, 1755, 2177, 2210, 2438, 2467, 2578],
  [28398660, 182, 304, 437, 525, 560, 801, 862, 907, 1604, 1857, 1931, 2535],
  [28403403, 110, 146, 389, 992, 2115, 2140, 2854, 2926, 3643, 3760, 4044, 4168],
  [28485363, 54, 161, 682, 1045, 1187, 1226, 1425, 1560, 1789, 1847, 1906, 2234],
  [28948903, 181, 205, 853, 1270, 1549, 1599, 1637, 3179, 3335, 3473, 3564, 3717],
  [29000961, 274, 454, 1182, 1209, 1289, 1362, 1367, 1872, 2030, 2160, 2695, 2720],
  [29665479, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [29873475, 221, 797, 1036, 1602, 1616, 1673, 1813, 1969, 2031, 2169, 2551, 2605],
  [29941084, 134, 281, 567, 808, 867, 1018, 1100, 1555, 1859, 2002, 2078, 2230],
  [30065095, 15, 40, 569, 598, 943, 1227, 1265, 1741, 2181, 2267, 2334, 2609],
  [30090411, 803, 1168, 1242, 1954, 2251, 3494, 3580, 3828, 4384, 4461, 4865],
  [30235177, 202, 235, 539, 670, 793, 1352, 1975, 2412, 3271, 3366, 3470, 3630],
  [30597381, 134, 281, 567, 808, 867, 1018, 1100, 1555, 1859, 2002, 2078, 2230],
  [30855326, 55, 350, 406, 839, 900, 1224, 1330, 1702, 2023, 2156, 2327, 3047],
  [30948871, 183, 456, 534, 689, 1086, 1098, 1283, 1419, 1851, 2042, 2410, 2513],
  [31074305, 259, 269, 490, 519, 544, 871, 1037, 2455, 2464, 2576, 2673, 2826],
  [31113993, 55, 120, 160, 182, 406, 860, 933, 1163, 1600, 1691, 2099, 2156],
  [31513741, 324, 479, 750, 889, 1378, 1646, 1961, 1971, 2801, 3781, 3816, 3862],
  [31574414, 237, 316, 364, 783, 852, 1154, 1327, 1341, 1803, 1824, 1827, 2079],
  [31696423, 440, 691, 1131, 1204, 1917, 2382, 2491, 2512, 2531, 3400, 3411, 4070],
  [31715046, 221, 797, 1036, 1602, 1616, 1673, 1813, 1969, 2031, 2169, 2551, 2605],
  [31758123, 204, 1285, 1507, 1537, 1651, 1727, 1836, 2135, 2256, 2838, 4498, 4837],
  [31875070, 32, 286, 452, 477, 869, 1111, 1119, 1637, 2502, 2597, 2908, 3515],
  [32019111, 202, 235, 539, 670, 793, 1352, 1975, 2412, 3271, 3366, 3470, 3630],
  [32188339, 381, 400, 988, 1022, 1029, 1088, 1250, 1296, 1393, 1432, 1580, 1997],
  [32291648, 36, 146, 793, 930, 1196, 1450, 1508, 1671, 2045, 2128, 2140, 2191],
  [32768373, 22, 314, 358, 476, 1009, 1113, 1307, 1597, 1619, 1628, 1659, 2120],
  [32984377, 183, 456, 534, 689, 1086, 1098, 1283, 1419, 1851, 2042, 2410, 2513],
  [33362855, 192, 235, 1610, 1677, 1884, 2270, 2357, 2854, 3339, 3376, 3487, 4116],
  [33963088, 204, 1285, 1507, 1537, 1651, 1727, 1836, 2135, 2256, 2838, 4498, 4837],
  [34059093, 259, 269, 490, 519, 544, 871, 1037, 2455, 2464, 2576, 2673, 2826],
  [34132204, 234, 251, 482, 674, 707, 1063, 1172, 1200, 1712, 1799, 1869, 2479],
  [34505873, 74, 426, 483, 523, 1025, 1240, 1257, 1537, 2063, 2135, 2256, 2280],
  [34795392, 140, 194, 222, 709, 743, 1407, 1850, 1897, 2328, 2466, 2533, 2650],
  [35359350, 252, 413, 659, 1044, 1281, 1518, 2179, 2381, 2413, 2659, 2770, 2941],
  [35411148, 74, 426, 483, 523, 1025, 1240, 1257, 1537, 2063, 2135, 2256, 2280],
  [35470393, 347, 1000, 1043, 1269, 1545, 1743, 2971, 2989, 3202, 3264, 3433, 3551],
  [35534136, 26, 101, 244, 471, 547, 907, 1144, 1315, 1551, 1719, 1750, 2748],
  [35763621, 410, 496, 502, 716, 749, 857, 1577, 1746, 1940, 2055, 2387, 2668],
  [35913974, 68, 197, 249, 1314, 1426, 1596, 1690, 1758, 1927, 2077, 2100, 2363],
  [36253590, 859, 1087, 1247, 1381, 1405, 1410, 1933, 2028, 2699, 3045, 3135, 3331],
  [36563451, 183, 456, 534, 689, 1086, 1098, 1283, 1419, 1851, 2042, 2410, 2513],
  [36699376, 289, 443, 749, 1112, 1394, 1466, 1577, 1793, 2279, 2375, 2982, 3011],
  [37576787, 775, 810, 1277, 1340, 1345, 1682, 2797, 3065, 3395, 3663, 3741, 3794],
  [37735502, 86, 371, 473, 745, 979, 1444, 1482, 1676, 1774, 1907, 1911, 2462],
  [38104212, 71, 129, 400, 906, 1213, 1250, 1393, 1797, 1870, 1889, 1997, 2602],
  [38119069, 183, 456, 534, 689, 1086, 1098, 1283, 1419, 1851, 2042, 2410, 2513],
  [38424797, 55, 350, 406, 839, 900, 1224, 1330, 1702, 2023, 2156, 2327, 3047],
  [38761459, 410, 496, 502, 716, 749, 857, 1577, 1746, 1940, 2055, 2387, 2668],
  [38858605, 616, 726, 731, 1351, 1721, 1821, 1834, 1840, 1993, 3017, 3115, 3666],
  [38954640, 20, 210, 633, 1178, 1893, 2226, 2545, 2785, 3055, 3089, 3407, 3457],
  [39255651, 134, 281, 567, 808, 867, 1018, 1100, 1555, 1859, 2002, 2078, 2230],
  [40066552, 19, 468, 593, 787, 1359, 1589, 2032, 2399, 2447, 2541, 2574, 2614],
  [40175268, 419, 432, 609, 661, 703, 706, 1080, 1355, 1666, 1723, 2133, 2207],
  [40653254, 161, 682, 811, 953, 1306, 1611, 1755, 2177, 2210, 2438, 2467, 2578],
  [40662552, 167, 229, 337, 935, 939, 1494, 1542, 1786, 1918, 1994, 2301, 2683],
  [41081032, 89, 96, 246, 302, 328, 414, 643, 677, 1233, 1301, 1878, 2188],
  [41116363, 89, 96, 246, 302, 328, 414, 643, 677, 1233, 1301, 1878, 2188],
  [41203104, 134, 281, 567, 808, 867, 1018, 1100, 1555, 1859, 2002, 2078, 2230],
  [41599250, 222, 535, 648, 743, 779, 1278, 1407, 1414, 1607, 1783, 1965, 2151],
  [41801925, 274, 454, 1182, 1209, 1289, 1362, 1367, 1872, 2030, 2160, 2695, 2720],
  [41891134, 347, 1000, 1043, 1269, 1545, 1743, 2971, 2989, 3202, 3264, 3433, 3551],
  [41987534, 48, 51, 90, 117, 676, 944, 996, 997, 1091, 1148, 1337, 1583],
  [42423773, 597, 1132, 1225, 1491, 1532, 1629, 1692, 1785, 1795, 2260, 2966, 3071],
  [42882940, 137, 380, 517, 774, 877, 1581, 1964, 2050, 2111, 2172, 2507, 2515],
  [43169559, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [43539775, 684, 764, 1186, 1712, 1768, 1869, 2037, 2051, 2197, 2233, 2454, 2714],
  [43987848, 300, 745, 976, 1070, 1676, 1700, 1921, 1925, 2462, 2629, 3257, 3305],
  [44303795, 859, 1087, 1247, 1381, 1405, 1410, 1933, 2028, 2699, 3045, 3135, 3331],
  [44374485, 96, 323, 327, 643, 655, 966, 1878, 1939, 2807, 3027, 3660, 3963],
  [45051247, 8, 19, 83, 468, 593, 1402, 1592, 1675, 2011, 2032, 2245, 2417],
  [45069840, 274, 454, 1182, 1209, 1289, 1362, 1367, 1872, 2030, 2160, 2695, 2720],
  [45143795, 222, 535, 648, 743, 779, 1278, 1407, 1414, 1607, 1783, 1965, 2151],
  [45504296, 92, 99, 173, 237, 741, 1740, 1803, 2149, 2215, 2522, 2846, 2925],
  [46294308, 140, 194, 222, 709, 743, 1407, 1850, 1897, 2328, 2466, 2533, 2650],
  [46582643, 324, 479, 750, 889, 1378, 1646, 1961, 1971, 2801, 3781, 3816, 3862],
  [47770132, 355, 550, 957, 1218, 1347, 1586, 1749, 1845, 1943, 2499, 2534, 2553],
  [47811584, 134, 281, 567, 808, 867, 1018, 1100, 1555, 1859, 2002, 2078, 2230],
  [47911699, 725, 876, 1529, 1626, 1734, 1812, 1969, 2129, 2250, 2396, 2482, 2766],
  [48040856, 221, 797, 1036, 1602, 1616, 1673, 1813, 1969, 2031, 2169, 2551, 2605],
  [48390648, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [48474956, 55, 350, 406, 839, 900, 1224, 1330, 1702, 2023, 2156, 2327, 3047],
  [48843121, 54, 161, 682, 1045, 1187, 1226, 1425, 1560, 1789, 1847, 1906, 2234],
  [48890415, 207, 275, 576, 826, 1064, 1460, 1725, 1876, 2057, 2371, 2442, 3123],
  [49293140, 36, 146, 793, 930, 1196, 1450, 1508, 1671, 2045, 2128, 2140, 2191],
  [49801853, 455, 559, 935, 939, 1051, 1183, 1385, 2469, 2518, 2676, 2718, 2753],
  [50309525, 237, 316, 364, 783, 852, 1154, 1327, 1341, 1803, 1824, 1827, 2079],
  [50653220, 61, 88, 183, 436, 456, 577, 974, 1098, 1852, 1862, 2429, 2513],
  [51301207, 19, 468, 593, 787, 1359, 1589, 2032, 2399, 2447, 2541, 2574, 2614],
  [51409075, 259, 269, 490, 519, 544, 871, 1037, 2455, 2464, 2576, 2673, 2826],
  [51672224, 74, 426, 483, 523, 1025, 1240, 1257, 1537, 2063, 2135, 2256, 2280],
  [52148466, 137, 380, 517, 774, 877, 1581, 1964, 2050, 2111, 2172, 2507, 2515],
  [52151046, 192, 235, 1610, 1677, 1884, 2270, 2357, 2854, 3339, 3376, 3487, 4116],
  [52554371, 221, 797, 1036, 1602, 1616, 1673, 1813, 1969, 2031, 2169, 2551, 2605],
  [53334328, 10, 79, 343, 785, 1697, 2183, 2295, 2476, 2735, 2888, 2930, 3060],
  [53342502, 204, 1285, 1507, 1537, 1651, 1727, 1836, 2135, 2256, 2838, 4498, 4837],
  [53934863, 390, 982, 1219, 1429, 1621, 1636, 2069, 2867, 2931, 3016, 3689],
  [54415140, 198, 324, 341, 848, 889, 1279, 1961, 1971, 2996, 3586, 3816, 4441],
  [54675041, 616, 726, 731, 1351, 1721, 1821, 1834, 1840, 1993, 3017, 3115, 3666],
  [54728734, 15, 40, 569, 598, 943, 1227, 1265, 1741, 2181, 2267, 2334, 2609],
  [55058049, 209, 812, 1475, 1528, 1633, 1772, 1815, 1895, 1926, 2105, 2292, 2532],
  [55159283, 8, 19, 83, 468, 593, 1402, 1592, 1675, 2011, 2032, 2245, 2417],
  [55394606, 124, 245, 760, 1136, 1231, 1413, 1725, 1876, 2057, 2242, 2672, 3042],
  [55722368, 36, 146, 793, 930, 1196, 1450, 1508, 1671, 2045, 2128, 2140, 2191],
  [56844400, 55, 120, 160, 182, 406, 860, 933, 1163, 1600, 1691, 2099, 2156],
  [57008877, 222, 535, 648, 743, 779, 1278, 1407, 1414, 1607, 1783, 1965, 2151],
  [57152024, 86, 371, 473, 745, 979, 1444, 1482, 1676, 1774, 1907, 1911, 2462],
  [57356728, 204, 1285, 1507, 1537, 1651, 1727, 1836, 2135, 2256, 2838, 4498, 4837],
  [57569282, 68, 197, 249, 1314, 1426, 1596, 1690, 1758, 1927, 2077, 2100, 2363],
  [57780913, 300, 745, 976, 1070, 1676, 1700, 1921, 1925, 2462, 2629, 3257, 3305],
  [58204140, 455, 559, 935, 939, 1051, 1183, 1385, 2469, 2518, 2676, 2718, 2753],
  [58333780, 775, 810, 1277, 1340, 1345, 1682, 2797, 3065, 3395, 3663, 3741, 3794],
  [58675554, 22, 107, 358, 466, 590, 1333, 1392, 1598, 2120, 2275, 2281, 2656],
  [58773017, 67, 458, 775, 1026, 1390, 1431, 1461, 1489, 1679, 2205, 2394, 2771],
  [58791184, 63, 346, 619, 976, 1219, 1634, 2316, 2788, 2837, 2931, 3028, 3766],
  [59033414, 48, 51, 90, 117, 676, 944, 996, 997, 1091, 1148, 1337, 1583],
  [59193725, 10, 79, 343, 785, 1697, 2183, 2295, 2476, 2735, 2888, 2930, 3060],
  [59223736, 48, 51, 90, 117, 676, 944, 996, 997, 1091, 1148, 1337, 1583],
  [59822874, 19, 468, 593, 787, 1359, 1589, 2032, 2399, 2447, 2541, 2574, 2614],
  [59942959, 347, 1000, 1043, 1269, 1545, 1743, 2971, 2989, 3202, 3264, 3433, 3551],
];

// Move each watched role to a fresh station and translate its patrol by the
// same distance. This preserves its 5-rotation truth table while changing
// the actual people on the patrol. Changes are fully re-certified afterwards.
function reroute(base,draw) {
  const all = shuffle(duties,draw);
  const first = shuffle(duties,draw).slice(0,4);
  const watch = [first,shuffle([...duties.filter(r => !first.includes(r)),...shuffle(first,draw).slice(0,2)],draw)];
  const crews = base.crews.map(({names},c) => ({names,stations:crewStations(all.slice(2*c,2*c+2),draw)}));
  const reports = base.reports.map((report,i) => ({same:false,paths:report.paths.map((p,c) => {
    const before = base.crews[c];
    const after = crews[c];
    const role = watch[c][i];
    const shift = after.stations.findIndex(s=>s.includes(role)) - before.stations.findIndex(s=>s.includes(p.role));
    const move = name => after.names[(before.names.indexOf(name) + shift + 5) % 5];
    return {from:move(p.from),to:move(p.to),role};
  })}));
  return {crews,reports};
}

function instantiate(base, names, roleOrder, draw) {
  const nameFor = Object.fromEntries(cast.map((name,i) => [name,names[i]]));
  const dutyMap = order => Object.fromEntries(duties.map((role,i) => [role,order[i]]));
  const maps = [dutyMap(roleOrder),dutyMap(roleOrder)];
  const watched = [0,1].map(c => [...new Set(base.reports.map(r => r.paths[c].role))]);
  const double = base.crews.map(crew => crew.stations.find(s => s.length === 2));
  const firstWatch = watched[0].map(r => maps[0][r]);
  const firstDouble = double[0].map(r => maps[0][r]);
  for (let i=0; i<24; i++) {
    const candidate = dutyMap(shuffle(duties,draw));
    if (double[1].some(r => firstDouble.includes(candidate[r]))) continue;
    if (new Set([...firstWatch,...watched[1].map(r => candidate[r])]).size !== 6) continue;
    maps[1] = candidate;
    break;
  }
  // A circuit has no privileged starting position. Choose separate display
  // origins for both name tracks and duty tracks to avoid stable seat cues.
  const rotate = list => {
    const start = Math.floor(draw()*list.length);
    return [...list.slice(start),...list.slice(0,start)];
  };
  const crews = base.crews.map((crew,c) => ({
    names:rotate(crew.names.map(n => nameFor[n])),
    stations:rotate(crew.stations.map(station => station.map(r => maps[c][r])))
  }));
  const reports = base.reports.map(row => ({same:false, paths:row.paths.map((p,c) => {
    const reverse = draw() < .5;
    return {from:nameFor[reverse ? p.to : p.from],to:nameFor[reverse ? p.from : p.to],role:maps[c][p.role]};
  })}));
  if (draw() < .5) {
    crews.reverse();
    reports.forEach(report => report.paths.reverse());
  }
  return {crews,reports};
}

export function makeDutyTrial(previous=null,random=Math.random) {
  const number = (previous?.number ?? 0)+1;
  const draw = makeDraw(random,number);
  const previousPair = previous?.pair?.slice() ?? [];
  const names = shuffle(cast,draw);
  const roleOrder = shuffle(duties,draw);
  const entry = frameLibrary[Math.floor(draw()*frameLibrary.length)];
  const source = randomBoard(cast,makeDraw(() => entry[0] / 4294967296, 0));
  const variation = entry[1 + Math.floor(draw()*(entry.length - 1))];
  const base = reroute(source,makeDraw(() => variation / 4294967296, 0));
  let board = {number,previousPair,...instantiate(base,names,roleOrder,draw)};
  let good = certifiedWorlds(board);
  if (!good.length) {
    // Put both prior names in the same crew. Every solution or alternate has
    // one member from each crew, so this restores the seed's certified states.
    const a = names.indexOf(previousPair[0]);
    const b = names.indexOf(previousPair[1]);
    const alternatives = offsets.map(i => i + (a < 5 ? 0 : 5)).filter(i => i !== a);
    const swap = alternatives[Math.floor(draw()*alternatives.length)];
    [names[swap],names[b]] = [names[b],names[swap]];
    board = {number,previousPair,...instantiate(base,names,roleOrder,draw)};
    good = certifiedWorlds(board);
  }
  return finish(board,good[Math.floor(draw()*good.length)],draw);
}
