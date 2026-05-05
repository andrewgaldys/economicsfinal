/* ═══════════════════════════════════════════════
   ECONOPOLY — Full Game Logic
   ═══════════════════════════════════════════════ */

// ─── GAME CONFIG ─────────────────────────────────
const CONFIG = {
  startingCash: 2000,
  goBonus: 200,
  maxTurns: 30,
  loanLimit: 5000,
  eventFrequency: 4,  // every N turns, trigger an economic event
};

// ─── BOARD TILES ─────────────────────────────────
// 24-tile board: corners + properties + events
const TILE_COLORS = {
  'Tech Hub':     '#40c8f0',
  'Finance':      '#f0c040',
  'Real Estate':  '#40e090',
  'Industry':     '#f07040',
  'Energy':       '#a060f0',
};

const BOARD_TILES = [
  // BOTTOM ROW (right to left) — tiles 0-6
  { id: 0,  type: 'go',       name: 'GO',          icon: '🏁' },
  { id: 1,  type: 'property', name: 'Silicon Row',  district: 'Tech Hub',    price: 180, rent: 20 },
  { id: 2,  type: 'property', name: 'Algo Alley',   district: 'Tech Hub',    price: 220, rent: 25 },
  { id: 3,  type: 'event',    name: 'Market News',  icon: '📰' },
  { id: 4,  type: 'property', name: 'Wall St.',     district: 'Finance',     price: 280, rent: 35 },
  { id: 5,  type: 'property', name: 'Bond Ave.',    district: 'Finance',     price: 320, rent: 42 },
  { id: 6,  type: 'tax',      name: 'Income Tax',   icon: '💸', amount: 150 },

  // RIGHT COLUMN (bottom to top) — tiles 7-12
  { id: 7,  type: 'corner',   name: 'Jail Visit',   icon: '⛓' },
  { id: 8,  type: 'property', name: 'Brick Lane',   district: 'Real Estate', price: 180, rent: 22 },
  { id: 9,  type: 'property', name: 'Marble Sq.',   district: 'Real Estate', price: 240, rent: 30 },
  { id: 10, type: 'event',    name: 'Market News',  icon: '📰' },
  { id: 11, type: 'property', name: 'Coal Creek',   district: 'Industry',    price: 260, rent: 33 },
  { id: 12, type: 'property', name: 'Steel Mill',   district: 'Industry',    price: 300, rent: 40 },

  // TOP ROW (left to right) — tiles 13-18
  { id: 13, type: 'corner',   name: 'Free Park',    icon: '🌳' },
  { id: 14, type: 'property', name: 'Solar Farm',   district: 'Energy',      price: 340, rent: 48 },
  { id: 15, type: 'property', name: 'Wind Ridge',   district: 'Energy',      price: 360, rent: 52 },
  { id: 16, type: 'event',    name: 'Market News',  icon: '📰' },
  { id: 17, type: 'property', name: 'Gold Gate',    district: 'Finance',     price: 390, rent: 58 },
  { id: 18, type: 'tax',      name: 'Luxury Tax',   icon: '💎', amount: 200 },

  // LEFT COLUMN (top to bottom) — tiles 19-23
  { id: 19, type: 'corner',   name: 'Go To Jail',   icon: '🚔' },
  { id: 20, type: 'property', name: 'Copper Creek', district: 'Industry',    price: 200, rent: 28 },
  { id: 21, type: 'property', name: 'Harbor View',  district: 'Real Estate', price: 270, rent: 34 },
  { id: 22, type: 'event',    name: 'Market News',  icon: '📰' },
  { id: 23, type: 'property', name: 'Apex Tower',   district: 'Tech Hub',    price: 430, rent: 65 },
];

const TOTAL_TILES = BOARD_TILES.length; // 24

// ─── STOCKS ──────────────────────────────────────
const STOCKS = [
  { sym: 'TXH', name: 'TechX Holdings',    price: 100, shares: 0 },
  { sym: 'GRN', name: 'GreenEnergy Co.',   price: 80,  shares: 0 },
  { sym: 'FNB', name: 'FinBank Corp.',     price: 120, shares: 0 },
  { sym: 'IND', name: 'IndustryCap Ltd.', price: 90,  shares: 0 },
];

// ─── ECONOMIC EVENTS ──────────────────────────────
const EVENTS = [
  {
    id: 'recession',
    name: 'RECESSION',
    icon: '📉',
    desc: 'Economic downturn hits. Property values fall across the board.',
    effect: (state) => {
      let lines = [];
      state.tiles.forEach(t => {
        if (t.type === 'property') {
          t.price = Math.round(t.price * 0.8);
          t.rent  = Math.round(t.rent  * 0.8);
        }
      });
      STOCKS.forEach(s => { s.price = Math.round(s.price * 0.75); });
      lines.push('📉 All property values −20%');
      lines.push('📉 Stock prices −25%');
      return lines;
    }
  },
  {
    id: 'boom',
    name: 'ECONOMIC BOOM',
    icon: '🚀',
    desc: 'Markets surge! Property values and stocks jump significantly.',
    effect: (state) => {
      state.tiles.forEach(t => {
        if (t.type === 'property') {
          t.price = Math.round(t.price * 1.2);
          t.rent  = Math.round(t.rent  * 1.2);
        }
      });
      STOCKS.forEach(s => { s.price = Math.round(s.price * 1.3); });
      return ['🚀 All property values +20%', '🚀 Stock prices +30%'];
    }
  },
  {
    id: 'inflation',
    name: 'INFLATION SURGE',
    icon: '💹',
    desc: 'Inflation rips through the economy. All prices increase.',
    effect: (state) => {
      state.tiles.forEach(t => {
        if (t.type === 'property') { t.price = Math.round(t.price * 1.12); }
      });
      state.players.forEach(p => {
        if (!p.bankrupt) { p.cash = Math.max(0, p.cash - 100); }
      });
      return ['💹 Property prices +12%', '💸 Each player loses $100 to rising costs'];
    }
  },
  {
    id: 'interest_hike',
    name: 'RATE HIKE',
    icon: '🏦',
    desc: 'Central bank raises interest rates sharply.',
    effect: (state) => {
      state.interestRate = Math.min(state.interestRate + 3, 20);
      return [`🏦 Interest rate raised to ${state.interestRate}%`, '⚠ Existing loans cost more each turn'];
    }
  },
  {
    id: 'rate_cut',
    name: 'RATE CUT',
    icon: '✂️',
    desc: 'Central bank cuts rates to stimulate the economy.',
    effect: (state) => {
      state.interestRate = Math.max(state.interestRate - 2, 2);
      return [`✂️ Interest rate cut to ${state.interestRate}%`, '📈 Borrowing is cheaper now'];
    }
  },
  {
    id: 'stimulus',
    name: 'GOV. STIMULUS',
    icon: '💰',
    desc: 'Government sends stimulus checks to all citizens!',
    effect: (state) => {
      let bonus = 300;
      state.players.forEach(p => { if (!p.bankrupt) p.cash += bonus; });
      return [`💰 Each player receives $${bonus} stimulus`, '🎉 Economy gets a boost'];
    }
  },
  {
    id: 'tech_crash',
    name: 'TECH CRASH',
    icon: '💻',
    desc: 'The tech bubble bursts. Tech properties take a major hit.',
    effect: (state) => {
      state.tiles.forEach(t => {
        if (t.district === 'Tech Hub') {
          t.price = Math.round(t.price * 0.6);
          t.rent  = Math.round(t.rent  * 0.6);
        }
      });
      let txhStock = STOCKS.find(s => s.sym === 'TXH');
      if (txhStock) txhStock.price = Math.round(txhStock.price * 0.5);
      return ['💻 Tech Hub properties −40%', '📉 TXH stock loses half its value'];
    }
  },
  {
    id: 'oil_spike',
    name: 'OIL SPIKE',
    icon: '⛽',
    desc: 'Oil prices skyrocket, boosting energy sector.',
    effect: (state) => {
      state.tiles.forEach(t => {
        if (t.district === 'Energy') {
          t.price = Math.round(t.price * 1.35);
          t.rent  = Math.round(t.rent  * 1.35);
        }
      });
      let grnStock = STOCKS.find(s => s.sym === 'GRN');
      if (grnStock) grnStock.price = Math.round(grnStock.price * 1.4);
      return ['⛽ Energy properties +35%', '📈 GRN stock surges +40%'];
    }
  },
];

// ─── GAME STATE ───────────────────────────────────
let G = {}; // main game state

function initGameState(playerSetups, maxTurns) {
  // Deep-clone tiles so prices can be modified
  const tiles = BOARD_TILES.map(t => ({ ...t }));

  // Reset stocks
  STOCKS.forEach((s, i) => {
    const base = [100, 80, 120, 90][i];
    s.price = base;
    s.prevPrice = base;
  });

  const players = playerSetups.map((ps, i) => ({
    id: i,
    name: ps.name,
    type: ps.type,    // 'salary' | 'business' | 'investor'
    color: `var(--p${i})`,
    colorHex: ['#f0c040','#40c8f0','#f07040','#a060f0'][i],
    emoji: ['🟡','🔵','🔴','🟣'][i],
    cash: CONFIG.startingCash,
    position: 0,
    properties: [],   // tile ids
    stocks: {},       // { sym: shares }
    loan: 0,
    netWorth: CONFIG.startingCash,
    bankrupt: false,
    turnsInJail: 0,
  }));

  G = {
    players,
    tiles,
    currentPlayerIdx: 0,
    turn: 1,
    maxTurns,
    interestRate: 5,
    phase: 'roll',    // 'roll' | 'action' | 'end'
    pendingTile: null,
    hasRolled: false,
    eventQueue: [],
    lastEvent: null,
    stockHistory: {},
  };

  STOCKS.forEach(s => { G.stockHistory[s.sym] = [s.price]; });
}

// ─── NET WORTH CALCULATION ────────────────────────
function calcNetWorth(player) {
  let worth = player.cash;
  // Properties
  player.properties.forEach(tid => {
    const t = G.tiles[tid];
    if (t) worth += t.price;
  });
  // Stocks
  STOCKS.forEach(s => {
    const shares = player.stocks[s.sym] || 0;
    worth += shares * s.price;
  });
  // Subtract debt
  worth -= player.loan;
  return Math.max(0, worth);
}

// ─── INCOME BY TYPE ───────────────────────────────
function collectIncome(player) {
  let income = 0;
  if (player.type === 'salary') {
    income = 150; // stable
  } else if (player.type === 'business') {
    // variable: base 100, ±80
    income = 100 + Math.floor((Math.random() - 0.5) * 160);
    income = Math.max(0, income);
  } else if (player.type === 'investor') {
    // earns from owned properties (bonus rent) + stock dividends
    income = player.properties.length * 20;
    STOCKS.forEach(s => {
      const shares = player.stocks[s.sym] || 0;
      income += Math.floor(shares * s.price * 0.04); // 4% dividend
    });
  }
  return income;
}

// ─── DICE ─────────────────────────────────────────
function rollDice() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { d1, d2, total: d1 + d2 };
}

// ─── DEMAND SYSTEM ───────────────────────────────
// Track how many times each tile has been landed on
function updateDemand(tileId) {
  const t = G.tiles[tileId];
  if (!t || t.type !== 'property') return;
  t.landCount = (t.landCount || 0) + 1;
  // Value increases with demand
  if (t.landCount % 3 === 0) {
    t.price = Math.round(t.price * 1.05);
    t.rent  = Math.round(t.rent  * 1.05);
  }
}

// Natural decay: properties that haven't been landed on recently lose value
function applyDemandDecay() {
  G.tiles.forEach(t => {
    if (t.type !== 'property') return;
    if (!t.landCount || t.landCount === 0) {
      t.price = Math.max(50, Math.round(t.price * 0.97));
      t.rent  = Math.max(5,  Math.round(t.rent  * 0.97));
    }
    // Reset count each round so decay can apply
  });
}

// ─── STOCK FLUCTUATION ────────────────────────────
function fluctuateStocks() {
  STOCKS.forEach(s => {
    s.prevPrice = s.price;
    const chg = (Math.random() - 0.48) * 0.15; // slight upward bias
    s.price = Math.max(10, Math.round(s.price * (1 + chg)));
    G.stockHistory[s.sym].push(s.price);
    if (G.stockHistory[s.sym].length > 20) G.stockHistory[s.sym].shift();
  });
}

// ─── LOAN INTEREST ACCRUAL ────────────────────────
function accrueInterest(player) {
  if (player.loan > 0) {
    const interest = Math.round(player.loan * G.interestRate / 100);
    player.loan += interest;
    return interest;
  }
  return 0;
}

// ─── EVENT TRIGGER CHECK ──────────────────────────
function checkForEvent() {
  if (G.turn % CONFIG.eventFrequency === 0) {
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    return ev;
  }
  return null;
}

/* ═══════════════════════════════════════════════
   UI / RENDERING
   ═══════════════════════════════════════════════ */

function renderBoard() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';

  // 24 tiles around a 7×7 grid (perimeter = 24 cells exactly)
  // Row 0: cols 0-6  (7 tiles) → tile 0-6   bottom row
  // Col 6: rows 6-1  (6 tiles) → tile 7-12  right col
  // Row 6: cols 6-0  (7 tiles, skip corner already done) — wait, let's map cleanly:
  //
  // We use a TRUE square Monopoly layout:
  //   Bottom row  (row 6, col 0→6): tiles 0-6
  //   Right col   (col 6, row 5→0): tiles 7-12
  //   Top row     (row 0, col 6→0): tiles 13-18 (skip corners already placed)  — actually include corners
  //   Left col    (col 0, row 1→5): tiles 19-23
  //
  // Perimeter of 7×7 = 4*6 = 24 ✓

  const SIZE = 7;
  board.style.display = 'grid';
  board.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${SIZE}, 1fr)`;
  board.style.gap = '3px';

  // Create all 49 cells
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      board.appendChild(cell);
    }
  }

    // Center area (rows 1-5, cols 1-5) — title panel
  const centerPanel = document.createElement('div');
  centerPanel.className = 'board-center-panel';
  centerPanel.style.gridColumn = '2 / 7';
  centerPanel.style.gridRow = '2 / 7';

  centerPanel.innerHTML = `
    <div class="board-center-title">ECONOPOLY</div>
    <div class="board-center-turn">TURN ${G.turn} / ${G.maxTurns}</div>
    <div class="board-center-players">
      ${G.players.map(p => `
        <div class="board-center-player" style="border-color:${p.colorHex}">
          <div class="board-center-dot" style="background:${p.colorHex}"></div>
          <span style="color:${p.colorHex}">${p.name.split(' ')[0]}</span>
        </div>
      `).join('')}
    </div>
  `;

  board.appendChild(centerPanel);

  // Map tile index → grid cell position (clockwise from bottom-left corner)
  // Bottom row left→right: (6,0),(6,1),(6,2),(6,3),(6,4),(6,5),(6,6) → tiles 0-6
  // Right col bottom→top:  (5,6),(4,6),(3,6),(2,6),(1,6),(0,6)       → tiles 7-12
  // Top row right→left:    (0,5),(0,4),(0,3),(0,2),(0,1),(0,0)       → tiles 13-18
  // Left col top→bottom:   (1,0),(2,0),(3,0),(4,0),(5,0)             → tiles 19-23
  const tilePositions = [
    // Bottom row
    [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],
    // Right col (bottom to top, skipping corner)
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
    // Top row (right to left, skipping corner)
    [0,5],[0,4],[0,3],[0,2],[0,1],[0,0],
    // Left col (top to bottom, skipping corners)
    [1,0],[2,0],[3,0],[4,0],[5,0],
  ];

  tilePositions.forEach(([row, col], idx) => {
    const cellIdx = row * SIZE + col;
    const cell = board.children[cellIdx];
    renderTile(cell, BOARD_TILES[idx], idx);
  });
}

function renderTile(cell, tile, idx) {
  const col = tile.district ? TILE_COLORS[tile.district] : null;
  const isOwned = tile.ownerId !== undefined;
  const owner = isOwned ? G.players[tile.ownerId] : null;

  let classes = 'tile';
  if (tile.type === 'go')      classes += ' go-tile corner-tile';
  if (tile.type === 'corner')  classes += ' corner-tile';
  if (tile.type === 'jail')    classes += ' jail-tile corner-tile';
  if (tile.type === 'tax')     classes += ' tax-tile';
  if (tile.type === 'event')   classes += ' event-tile';

  const colorBar = col ? `<div class="tile-color-bar" style="background:${col}"></div>` : '';
  const ownerDot = owner ? `<div class="tile-owner-dot" style="background:${owner.colorHex}"></div>` : '';

  let content = '';
  if (tile.type === 'property') {
    content = `
      ${colorBar}
      <div class="tile-name">${tile.name}</div>
      <div class="tile-price">$${tile.price}</div>
      ${ownerDot}
    `;
  } else {
    content = `
      <div class="tile-icon">${tile.icon || '?'}</div>
      <div class="tile-name">${tile.name}</div>
      ${ownerDot}
    `;
  }

  // Tokens (players on this tile)
  const playersHere = G.players.filter(p => !p.bankrupt && p.position === idx);
  let tokens = '';
  if (playersHere.length > 0) {
    tokens = `<div class="tokens-wrap">` +
      playersHere.map(p => `
        <div class="player-token" style="background:${p.colorHex};box-shadow:0 0 7px ${p.colorHex},0 2px 4px rgba(0,0,0,.7)">
          ${p.id + 1}
        </div>`).join('') +
    `</div>`;
  }

  cell.className = classes;
  // Glow the tile border in the player's color when occupied
  if (playersHere.length > 0) {
    cell.style.borderColor = playersHere[0].colorHex;
    cell.style.boxShadow = `inset 0 0 12px ${playersHere[0].colorHex}44`;
  } else {
    cell.style.borderColor = '';
    cell.style.boxShadow = '';
  }
  cell.innerHTML = content + tokens;
  cell.title = tile.name + (tile.price ? ` — $${tile.price}` : '');

  if (tile.type === 'property') {
    cell.addEventListener('click', () => showPropertyInfo(idx));
  }
}

function showPropertyInfo(tileIdx) {
  const t = G.tiles[tileIdx];
  if (t.type !== 'property') return;

  const owner = t.ownerId !== undefined ? G.players[t.ownerId] : null;
  const demand = getDemandLabel(t.landCount || 0);

  document.getElementById('prop-district').textContent = t.district;
  document.getElementById('prop-name').textContent = t.name;
  document.getElementById('prop-price').textContent = `$${t.price}`;
  document.getElementById('prop-rent').textContent = `$${t.rent}`;
  document.getElementById('prop-demand').textContent = demand;
  document.getElementById('prop-owner').textContent = owner ? owner.name : 'Unowned';

  const modal = document.getElementById('property-modal');
  const buyBtn = document.getElementById('prop-buy-confirm');

  const activePlayer = G.players[G.currentPlayerIdx];
  const canBuy = !owner && G.hasRolled && activePlayer.position === tileIdx && !activePlayer.bankrupt;

  buyBtn.style.display = canBuy ? 'block' : 'none';
  buyBtn.onclick = () => { buyProperty(tileIdx); closeModal('property-modal'); };

  modal.style.display = 'flex';
}

function getDemandLabel(count) {
  if (count === 0) return 'Low';
  if (count < 3)   return 'Medium';
  if (count < 6)   return 'High';
  return 'Very High';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// ─── PLAYER STATS RENDERING ───────────────────────
function renderPlayers() {
  const list = document.getElementById('players-list');
  list.innerHTML = '';
  G.players.forEach(p => {
    p.netWorth = calcNetWorth(p);
    const isActive = p.id === G.currentPlayerIdx;
    const div = document.createElement('div');
    div.className = 'player-card' + (isActive ? ' active-turn' : '');
    div.innerHTML = `
      <div class="player-avatar" style="background:${p.colorHex}">${p.id+1}</div>
      <div class="player-info">
        <div class="player-nm">${p.name}</div>
        <div class="player-tp">${typeLabel(p.type)} · ${p.properties.length} props</div>
      </div>
      <div>
        <div class="player-cash-disp">$${p.cash.toLocaleString()}</div>
        <div class="player-nw-disp">NW: $${p.netWorth.toLocaleString()}</div>
      </div>
      ${p.bankrupt ? '<div class="bankrupt-badge">BANKRUPT</div>' : ''}
    `;
    list.appendChild(div);
  });
}

function renderActivePlayer() {
  const p = G.players[G.currentPlayerIdx];
  p.netWorth = calcNetWorth(p);
  document.getElementById('active-name').textContent = p.name;
  document.getElementById('active-type').textContent = typeLabel(p.type).toUpperCase();
  document.getElementById('active-cash').textContent = `$${p.cash.toLocaleString()}`;
  document.getElementById('active-networth').textContent = `$${p.netWorth.toLocaleString()}`;
  document.getElementById('active-debt').textContent = `$${p.loan.toLocaleString()}`;
}

function typeLabel(t) {
  return { salary: 'Salaried Worker', business: 'Business Owner', investor: 'Investor' }[t] || t;
}

function renderStocks() {
  const el = document.getElementById('stock-tickers');
  el.innerHTML = STOCKS.map(s => {
    const chg = s.price - s.prevPrice;
    const pct = s.prevPrice > 0 ? ((chg / s.prevPrice) * 100).toFixed(1) : '0.0';
    const cls = chg >= 0 ? 'up' : 'down';
    const arrow = chg >= 0 ? '▲' : '▼';
    return `<div class="stock-chip">
      <span class="stock-sym">${s.sym}</span>
      <span class="stock-price">$${s.price}</span>
      <span class="stock-chg ${cls}">${arrow}${Math.abs(pct)}%</span>
    </div>`;
  }).join('');
}

function renderButtons() {
  const p = G.players[G.currentPlayerIdx];
  const tile = G.tiles[p.position];

  const btnRoll = document.getElementById('btn-roll');
  const btnBuy  = document.getElementById('btn-buy');
  const btnEnd  = document.getElementById('btn-end');

  btnRoll.disabled = G.hasRolled || p.bankrupt;
  btnEnd.disabled  = !G.hasRolled;

  const canBuy = tile && tile.type === 'property' && tile.ownerId === undefined && !p.bankrupt;
  btnBuy.disabled = !canBuy || !G.hasRolled;
}

function addLog(msg, cls = '') {
  const log = document.getElementById('game-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry' + (cls ? ' ' + cls : '');
  const ts = `T${G.turn}`;
  entry.innerHTML = `<span style="color:var(--muted)">[${ts}]</span> ${msg}`;
  log.insertBefore(entry, log.firstChild);
}

// ─── MAIN ROLL LOGIC ──────────────────────────────
function doRoll() {
  if (G.hasRolled) return;
  G.hasRolled = true;

  const { d1, d2, total } = rollDice();

  // Animate dice
  const die1 = document.getElementById('die1');
  const die2 = document.getElementById('die2');
  die1.classList.add('rolling');
  die2.classList.add('rolling');
  setTimeout(() => {
    die1.classList.remove('rolling');
    die2.classList.remove('rolling');
    die1.textContent = d1;
    die2.textContent = d2;
    document.getElementById('dice-total').textContent = `Total: ${total}`;
  }, 500);

  const p = G.players[G.currentPlayerIdx];

  // Collect income on each roll
  const income = collectIncome(p);
  if (income > 0) {
    p.cash += income;
    addLog(`${p.name} earns $${income} (${typeLabel(p.type)})`, 'good');
  }

  // Move player
  setTimeout(() => {
    const oldPos = p.position;
    p.position = (oldPos + total) % TOTAL_TILES;

    // Passed GO?
    if (p.position < oldPos || (oldPos === 0 && total > 0)) {
      p.cash += CONFIG.goBonus;
      addLog(`${p.name} passes GO! +$${CONFIG.goBonus}`, 'good');
    }

    addLog(`${p.name} rolled ${d1}+${d2}=${total} → ${BOARD_TILES[p.position].name}`, 'highlight');
    handleLanding(p);
    renderAll();
    renderButtons();
  }, 600);
}

function handleLanding(player) {
  const tile = G.tiles[player.position];
  updateDemand(player.position);

  if (tile.type === 'go') {
    // Extra bonus for landing on GO exactly
    player.cash += CONFIG.goBonus;
    addLog(`${player.name} lands on GO! Bonus $${CONFIG.goBonus}`, 'good');

  } else if (tile.type === 'property') {
    if (tile.ownerId !== undefined && tile.ownerId !== player.id) {
      // Pay rent
      const owner = G.players[tile.ownerId];
      const rent = tile.rent;
      const paid = Math.min(rent, player.cash);
      player.cash -= paid;
      owner.cash += paid;
      addLog(`${player.name} pays $${paid} rent to ${owner.name} for ${tile.name}`, 'bad');

      if (player.cash <= 0 && player.loan === 0) {
        player.bankrupt = true;
        addLog(`⚠ ${player.name} is BANKRUPT!`, 'bad');
      }
    } else if (tile.ownerId === undefined) {
      addLog(`${player.name} can buy ${tile.name} for $${tile.price}`, '');
      document.getElementById('btn-buy').disabled = false;
    } else {
      addLog(`${player.name} is on their own property: ${tile.name}`, '');
    }

  } else if (tile.type === 'tax') {
    const amt = Math.min(tile.amount, player.cash);
    player.cash -= amt;
    addLog(`${player.name} pays $${amt} in taxes`, 'bad');

  } else if (tile.type === 'event') {
    // Random mini-bonus or penalty
    const r = Math.random();
    if (r < 0.35) {
      const bonus = 50 + Math.floor(Math.random() * 150);
      player.cash += bonus;
      addLog(`📰 ${player.name} gets market news: +$${bonus} windfall!`, 'good');
    } else if (r < 0.65) {
      const loss = 50 + Math.floor(Math.random() * 100);
      player.cash = Math.max(0, player.cash - loss);
      addLog(`📰 ${player.name} gets market news: -$${loss} setback`, 'bad');
    } else {
      addLog(`📰 ${player.name} gets market news: No immediate impact`, '');
    }

  } else if (tile.type === 'corner' && tile.name === 'Go To Jail') {
    player.position = 7; // Jail tile
    player.turnsInJail = 2;
    addLog(`🚔 ${player.name} goes to jail! Skip 2 turns`, 'bad');

  } else if (tile.type === 'corner' && tile.name === 'Free Park') {
    const bonus = 100;
    player.cash += bonus;
    addLog(`🌳 ${player.name} enjoys Free Parking: +$${bonus}`, 'good');
  }
}

// ─── BUY PROPERTY ────────────────────────────────
function buyProperty(tileIdx) {
  const p = G.players[G.currentPlayerIdx];
  const t = G.tiles[tileIdx];
  if (t.ownerId !== undefined || p.cash < t.price) {
    addLog(`${p.name} can't afford ${t.name} ($${t.price})`, 'bad');
    return;
  }
  p.cash -= t.price;
  t.ownerId = p.id;
  p.properties.push(tileIdx);
  addLog(`${p.name} buys ${t.name} for $${t.price}`, 'good');
  renderAll();
  renderButtons();
}

// ─── LOAN SYSTEM ──────────────────────────────────
function openLoanModal() {
  const p = G.players[G.currentPlayerIdx];
  document.getElementById('loan-rate-text').textContent = `${G.interestRate}%`;
  const existingInfo = document.getElementById('loan-existing-info');
  if (p.loan > 0) {
    existingInfo.textContent = `⚠ Existing debt: $${p.loan}. New loan adds to this.`;
    existingInfo.style.display = 'block';
  } else {
    existingInfo.style.display = 'none';
  }
  document.getElementById('loan-modal').style.display = 'flex';
}

function takeLoan() {
  const p = G.players[G.currentPlayerIdx];
  const amount = parseInt(document.getElementById('loan-amount').value) || 0;
  if (amount < 100 || amount > CONFIG.loanLimit) {
    alert('Loan must be between $100 and $5,000');
    return;
  }
  if (p.loan + amount > CONFIG.loanLimit) {
    addLog(`${p.name} exceeds loan limit of $${CONFIG.loanLimit}`, 'bad');
    return;
  }
  p.cash += amount;
  p.loan += amount;
  addLog(`${p.name} takes a loan of $${amount} at ${G.interestRate}% interest`, 'highlight');
  closeModal('loan-modal');
  renderAll();
}

// ─── STOCK PURCHASE MODAL ─────────────────────────
function openStockModal() {
  const p = G.players[G.currentPlayerIdx];
  const list = document.getElementById('stock-list-modal');
  list.innerHTML = STOCKS.map(s => {
    const chg = s.price - s.prevPrice;
    const pct = s.prevPrice > 0 ? ((chg / s.prevPrice) * 100).toFixed(1) : '0.0';
    const cls = chg >= 0 ? 'up' : 'down';
    const arrow = chg >= 0 ? '▲' : '▼';
    const owned = p.stocks[s.sym] || 0;
    return `<div class="stock-item">
      <div class="stock-item-info">
        <div class="stock-item-sym">${s.sym}</div>
        <div class="stock-item-name">${s.name}</div>
        ${owned > 0 ? `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--accent)">You own: ${owned} shares</div>` : ''}
      </div>
      <div>
        <div class="stock-item-price">$${s.price}</div>
        <div class="stock-item-chg ${cls}">${arrow}${Math.abs(pct)}%</div>
      </div>
      <button class="stock-buy-btn" onclick="buyStock('${s.sym}')">BUY 1</button>
    </div>`;
  }).join('');
  document.getElementById('stock-modal').style.display = 'flex';
}

function buyStock(sym) {
  const p = G.players[G.currentPlayerIdx];
  const s = STOCKS.find(st => st.sym === sym);
  if (!s) return;
  if (p.cash < s.price) {
    addLog(`${p.name} can't afford ${sym} ($${s.price})`, 'bad');
    return;
  }
  p.cash -= s.price;
  p.stocks[sym] = (p.stocks[sym] || 0) + 1;
  addLog(`${p.name} buys 1 share of ${sym} at $${s.price}`, 'good');
  openStockModal(); // refresh
  renderAll();
}

// ─── STOCK SELL MODAL ─────────────────────────────
function openSellStockModal() {
  const p = G.players[G.currentPlayerIdx];
  const list = document.getElementById('sell-stock-list');
  const ownedStocks = STOCKS.filter(s => (p.stocks[s.sym] || 0) > 0);

  if (ownedStocks.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;padding:20px">You own no stocks to sell.</div>`;
  } else {
    list.innerHTML = ownedStocks.map(s => {
      const owned = p.stocks[s.sym] || 0;
      return `<div class="stock-item">
        <div class="stock-item-info">
          <div class="stock-item-sym">${s.sym}</div>
          <div class="stock-item-name">${s.name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--accent)">You own: ${owned} shares</div>
        </div>
        <div>
          <div class="stock-item-price">$${s.price}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--green)">Total: $${s.price * owned}</div>
        </div>
        <button class="stock-buy-btn" style="border-color:var(--red);color:var(--red)" onclick="sellStock('${s.sym}')">SELL 1</button>
      </div>`;
    }).join('');
  }
  document.getElementById('sell-stock-modal').style.display = 'flex';
}

function sellStock(sym) {
  const p = G.players[G.currentPlayerIdx];
  const s = STOCKS.find(st => st.sym === sym);
  if (!s || !p.stocks[sym] || p.stocks[sym] <= 0) return;
  p.stocks[sym]--;
  p.cash += s.price;
  addLog(`${p.name} sells 1 share of ${sym} for $${s.price}`, 'good');
  openSellStockModal(); // refresh
  renderAll();
}

// ─── END TURN ─────────────────────────────────────
function endTurn() {
  if (!G.hasRolled) return;

  const p = G.players[G.currentPlayerIdx];

  // Interest accrual
  const interest = accrueInterest(p);
  if (interest > 0) {
    addLog(`${p.name} owes $${interest} in loan interest`, 'bad');
    // Auto-pay from cash if possible
    if (p.cash >= interest) {
      p.cash -= interest;
      p.loan -= (interest); // partially reduce principal simulation
    }
  }

  // Check jail
  if (p.turnsInJail > 0) {
    p.turnsInJail--;
    addLog(`${p.name} is in jail. ${p.turnsInJail} turns remaining`, 'bad');
  }

  // Advance to next non-bankrupt player
  let nextIdx = (G.currentPlayerIdx + 1) % G.players.length;
  let loops = 0;
  while (G.players[nextIdx].bankrupt && loops < G.players.length) {
    nextIdx = (nextIdx + 1) % G.players.length;
    loops++;
  }

  // If we've looped all players in one round, increment turn
  if (nextIdx <= G.currentPlayerIdx || G.players.every((pp, i) => i === nextIdx || pp.bankrupt)) {
    G.turn++;
    applyDemandDecay();
    fluctuateStocks();
    document.getElementById('turn-display').textContent = G.turn;

    // Check economic event
    const ev = checkForEvent();
    if (ev) {
      showEvent(ev);
      return; // Event modal will call continueAfterEvent
    }
  }

  // Check game end
  if (G.turn > G.maxTurns) {
    showEndScreen();
    return;
  }

  G.currentPlayerIdx = nextIdx;
  G.hasRolled = false;
  G.pendingTile = null;

  renderAll();
  renderButtons();
  addLog(`─── ${G.players[G.currentPlayerIdx].name}'s turn ───`, 'highlight');
}

// ─── ECONOMIC EVENT DISPLAY ───────────────────────
let pendingContinue = null;

function showEvent(ev) {
  const effects = ev.effect(G);

  document.getElementById('event-icon').textContent = ev.icon;
  document.getElementById('event-type-text').textContent = 'ECONOMIC EVENT';
  document.getElementById('event-name-text').textContent = ev.name;
  document.getElementById('event-desc-text').textContent = ev.desc;
  document.getElementById('event-effects-text').innerHTML = effects.join('<br>');
  document.getElementById('event-modal').style.display = 'flex';

  const ticker = document.getElementById('ticker-text');
  ticker.textContent = ev.icon + ' ' + ev.name;
  ticker.className = 'ticker-text event-active';
  document.getElementById('interest-display').textContent = `${G.interestRate}%`;

  addLog(`⚡ EVENT: ${ev.name}`, 'event');
  effects.forEach(e => addLog(`  ${e}`, 'event'));

  G.lastEvent = ev;
  pendingContinue = continueAfterEvent;
}

function continueAfterEvent() {
  document.getElementById('event-modal').style.display = 'none';
  pendingContinue = null;

  if (G.turn > G.maxTurns) {
    showEndScreen();
    return;
  }

  const nextIdx = (G.currentPlayerIdx + 1) % G.players.length;
  G.currentPlayerIdx = nextIdx;
  G.hasRolled = false;

  // Restore ticker
  setTimeout(() => {
    const ticker = document.getElementById('ticker-text');
    ticker.textContent = 'Stable conditions';
    ticker.className = 'ticker-text';
  }, 8000);

  renderAll();
  renderButtons();
  addLog(`─── ${G.players[G.currentPlayerIdx].name}'s turn ───`, 'highlight');
}

// ─── END SCREEN ───────────────────────────────────
function showEndScreen() {
  G.players.forEach(p => { p.netWorth = calcNetWorth(p); });
  const sorted = [...G.players].sort((a, b) => b.netWorth - a.netWorth);

  const rankingsEl = document.getElementById('final-rankings');
  rankingsEl.innerHTML = sorted.map((p, i) => `
    <div class="ranking-row">
      <div class="rank-num">#${i+1}</div>
      <div class="rank-avatar" style="background:${p.colorHex}">${p.id+1}</div>
      <div class="rank-info">
        <div class="rank-name">${p.name}</div>
        <div class="rank-type">${typeLabel(p.type).toUpperCase()} · ${p.properties.length} properties</div>
      </div>
      <div class="rank-worth">$${p.netWorth.toLocaleString()}</div>
    </div>
  `).join('');

  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('end-screen').style.display = 'flex';
  document.getElementById('end-screen').classList.add('active');
}

// ─── MASTER RENDER ────────────────────────────────
function renderAll() {
  renderBoard();
  renderPlayers();
  renderActivePlayer();
  renderStocks();
  document.getElementById('turn-display').textContent = G.turn;
  document.getElementById('turn-max-display').textContent = `/ ${G.maxTurns}`;
  document.getElementById('interest-display').textContent = `${G.interestRate}%`;
}

/* ═══════════════════════════════════════════════
   SETUP SCREEN
   ═══════════════════════════════════════════════ */

let selectedPlayerCount = 2;
let selectedMaxTurns = 30;

function buildPlayerConfigs() {
  const container = document.getElementById('player-configs');
  container.innerHTML = '';
  for (let i = 0; i < selectedPlayerCount; i++) {
    const colors = ['#f0c040','#40c8f0','#f07040','#a060f0'];
    const defaultNames = ['Alex', 'Jordan', 'Casey', 'Morgan'];
    const div = document.createElement('div');
    div.className = 'player-config-row';
    div.innerHTML = `
      <div class="config-label" style="color:${colors[i]};font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px">PLAYER ${i+1}</div>
      <div class="field-group">
        <label>Name</label>
        <input type="text" id="pname-${i}" value="${defaultNames[i]}" maxlength="14" />
      </div>
      <div class="field-group">
        <label>Income Source</label>
        <div class="type-pills" id="ptype-${i}">
          <button class="type-pill active" data-type="salary">💼 SALARY</button>
          <button class="type-pill" data-type="business">🏭 BUSINESS</button>
          <button class="type-pill" data-type="investor">📈 INVESTOR</button>
        </div>
      </div>
    `;
    container.appendChild(div);

    // Pill selection
    const pills = div.querySelectorAll('.type-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  }
}

function getPlayerSetups() {
  const setups = [];
  for (let i = 0; i < selectedPlayerCount; i++) {
    const name = document.getElementById(`pname-${i}`).value.trim() || `Player ${i+1}`;
    const activePill = document.querySelector(`#ptype-${i} .type-pill.active`);
    const type = activePill ? activePill.dataset.type : 'salary';
    setups.push({ name, type });
  }
  return setups;
}

/* ═══════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── SETUP SCREEN ──
  buildPlayerConfigs();

  document.getElementById('player-count-select').addEventListener('click', e => {
    if (!e.target.classList.contains('pill')) return;
    document.querySelectorAll('#player-count-select .pill').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    selectedPlayerCount = parseInt(e.target.dataset.val);
    buildPlayerConfigs();
  });

  document.getElementById('turn-count-select').addEventListener('click', e => {
    if (!e.target.classList.contains('pill')) return;
    document.querySelectorAll('#turn-count-select .pill').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    selectedMaxTurns = parseInt(e.target.dataset.val);
  });

  document.getElementById('start-game-btn').addEventListener('click', () => {
    const setups = getPlayerSetups();
    initGameState(setups, selectedMaxTurns);

    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    document.getElementById('game-screen').classList.add('active');

    document.getElementById('turn-max-display').textContent = `/ ${selectedMaxTurns}`;

    renderAll();
    renderButtons();
    addLog(`─── GAME START! ${G.players[0].name} goes first ───`, 'highlight');
  });

  // ── GAME ACTIONS ──
  document.getElementById('btn-roll').addEventListener('click', () => {
    const p = G.players[G.currentPlayerIdx];
    if (p.turnsInJail > 0) {
      addLog(`${p.name} is in jail and must wait.`, 'bad');
      G.hasRolled = true;
      renderButtons();
      return;
    }
    doRoll();
  });

  document.getElementById('btn-buy').addEventListener('click', () => {
    const p = G.players[G.currentPlayerIdx];
    const t = G.tiles[p.position];
    if (t && t.type === 'property') {
      showPropertyInfo(p.position);
    }
  });

  document.getElementById('btn-loan').addEventListener('click', openLoanModal);
  document.getElementById('loan-confirm').addEventListener('click', takeLoan);
  document.getElementById('loan-cancel').addEventListener('click', () => closeModal('loan-modal'));

  document.getElementById('btn-stocks').addEventListener('click', openStockModal);
  document.getElementById('stock-close').addEventListener('click', () => closeModal('stock-modal'));

  document.getElementById('btn-sell-stocks').addEventListener('click', openSellStockModal);
  document.getElementById('sell-stock-close').addEventListener('click', () => closeModal('sell-stock-modal'));

  document.getElementById('btn-end').addEventListener('click', endTurn);

  document.getElementById('prop-cancel').addEventListener('click', () => closeModal('property-modal'));

  document.getElementById('event-close-btn').addEventListener('click', () => {
    if (pendingContinue) pendingContinue();
    else closeModal('event-modal');
  });

  document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('end-screen').classList.remove('active');
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'flex';
    document.getElementById('setup-screen').classList.add('active');
    buildPlayerConfigs();
  });

  // Close modals on overlay click
  ['event-modal','property-modal','loan-modal','stock-modal','sell-stock-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        if (id === 'event-modal') {
          if (pendingContinue) pendingContinue();
        } else {
          closeModal(id);
        }
      }
    });
  });
});
