// =============================================
// Snake Reloaded - Game Engine
// =============================================

// ── Settings & State ──
const settings = {
  mapSize: 'medium',
  speed: 'normal',
  mode: 'classic',
  skin: 'google',
};

// Google's 4 colors + dark option
const SKINS = {
  google: { head: '#34A853', body: '#2D8C4E', glow: 'rgba(52,168,83,0.2)' },
  blue:   { head: '#4285F4', body: '#1967D2', glow: 'rgba(66,133,244,0.2)' },
  red:    { head: '#EA4335', body: '#C5221F', glow: 'rgba(234,67,53,0.2)' },
  yellow: { head: '#FBBC04', body: '#E09206', glow: 'rgba(251,188,4,0.2)' },
  dark:   { head: '#5F6368', body: '#3C4043', glow: 'rgba(95,99,104,0.2)' },
};

const MAP_CONFIGS = {
  small:  { cols: 15, rows: 15, cell: 28 },
  medium: { cols: 20, rows: 20, cell: 24 },
  large:  { cols: 28, rows: 28, cell: 18 },
};

const SPEED_MS = {
  slow:   180,
  normal: 110,
  fast:   65,
};

const POWERUP_TYPES = [
  { emoji: '⚡', name: 'speed', color: '#ffff00', duration: 5000, effect: 'fast' },
  { emoji: '🛡️', name: 'shield', color: '#4488ff', duration: 6000, effect: 'immune' },
  { emoji: '✂️', name: 'shrink', color: '#ff44ff', duration: 0, effect: 'shrink' },
  { emoji: '×2', name: 'double', color: '#ff8800', duration: 5000, effect: 'double' },
];

// ── Special Fruits ──
const SPECIAL_FRUITS = [
  {
    id: 'banana',
    emoji: '🍌',
    label: '바나나',
    desc: '속도 감소! (-40%, 6초)',
    color: '#ffe033',
    glowColor: 'rgba(255,224,51,0.6)',
    bgColor: 'rgba(255,224,51,0.15)',
    points: 5,
    lifeMs: 9000,       // disappears after 9s if not eaten
    effect: 'slow',
    duration: 6000,
  },
  {
    id: 'grapes',
    emoji: '🍇',
    label: '포도',
    desc: '보너스 +50점!',
    color: '#cc44ff',
    glowColor: 'rgba(204,68,255,0.6)',
    bgColor: 'rgba(204,68,255,0.15)',
    points: 50,
    lifeMs: 7000,
    effect: 'bonus',
    duration: 0,
  },
  {
    id: 'orange',
    emoji: '🍊',
    label: '오렌지',
    desc: '3칸 추가 성장!',
    color: '#ff8800',
    glowColor: 'rgba(255,136,0,0.6)',
    bgColor: 'rgba(255,136,0,0.15)',
    points: 15,
    lifeMs: 8000,
    effect: 'grow3',
    duration: 0,
  },
  {
    id: 'strawberry',
    emoji: '🍓',
    label: '딸기',
    desc: '무적! (6초)',
    color: '#ff2255',
    glowColor: 'rgba(255,34,85,0.6)',
    bgColor: 'rgba(255,34,85,0.15)',
    points: 20,
    lifeMs: 8000,
    effect: 'immune',
    duration: 6000,
  },
  {
    id: 'lemon',
    emoji: '🍋',
    label: '레몬',
    desc: '방향 반전!',
    color: '#ddff00',
    glowColor: 'rgba(221,255,0,0.6)',
    bgColor: 'rgba(221,255,0,0.12)',
    points: 10,
    lifeMs: 6000,
    effect: 'reverse',
    duration: 0,
  },
];

// ── Floating Notifications ──
let notifications = [];

function showNotification(fruit) {
  notifications.push({
    emoji: fruit.emoji,
    label: fruit.label,
    desc: fruit.desc,
    color: fruit.color,
    x: canvas.width / 2,
    y: canvas.height / 2,
    alpha: 1,
    vy: -1.4,
    life: 1,
    born: Date.now(),
    totalLife: 1800,
  });
}

let state = {};
let gameLoop = null;
let activeEffects = {};
let specialFruitTimer = null;
let itemFieldTimer = null;

// ── Usable Items ──
const ITEM_TYPES = [
  {
    id: 'bomb',
    emoji: '💣',
    name: '꼬리 폭탄',
    desc: '꼬리의 절반을 제거!',
    key: 'Q',
    color: '#ff6633',
    glowColor: 'rgba(255,102,51,0.7)',
    bgColor: 'rgba(255,102,51,0.18)',
    lifeMs: 12000,
  },
  {
    id: 'timeslow',
    emoji: '⏱',
    name: '타임 슬로우',
    desc: '속도 50% 감소 (5초)',
    key: 'Z',
    color: '#44ddff',
    glowColor: 'rgba(68,221,255,0.7)',
    bgColor: 'rgba(68,221,255,0.18)',
    lifeMs: 10000,
  },
  {
    id: 'teleport',
    emoji: '🛸',
    name: '텔레포트',
    desc: '사과 바로 옆으로 이동!',
    key: 'X',
    color: '#aa55ff',
    glowColor: 'rgba(170,85,255,0.7)',
    bgColor: 'rgba(170,85,255,0.18)',
    lifeMs: 11000,
  },
];

// ── DOM References ──
const screens = {
  main: document.getElementById('mainScreen'),
  game: document.getElementById('gameScreen'),
  over: document.getElementById('gameOverScreen'),
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreDisplay = document.getElementById('scoreDisplay');
const highScoreGame = document.getElementById('highScoreGame');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const modeBadge = document.getElementById('modeBadge');
const powerupSlots = document.getElementById('powerupSlots');
const pauseOverlay = document.getElementById('pauseOverlay');

const MODE_LABELS = {
  classic:  'Classic',
  peace:    '☮ Peace',
  noBorder: '🌀 No Border',
  portal:   '🌀 Portal',
};

// ── Background Particles ──
(function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#00ff88','#00ccff','#cc00ff','#ff4466'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random()*100}%;
      --dur: ${4 + Math.random()*8}s;
      --delay: ${-Math.random()*12}s;
      background: ${colors[Math.floor(Math.random()*colors.length)]};
      width: ${1 + Math.random()*2}px;
      height: ${1 + Math.random()*2}px;
    `;
    container.appendChild(p);
  }
})();

// ── Option Buttons ──
document.querySelectorAll('.opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.group;
    document.querySelectorAll(`.opt-btn[data-group="${group}"]`)
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings[group] = btn.dataset.value;
  });
});

document.querySelectorAll('.skin-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.skin = btn.dataset.skin;
  });
});

// ── High Score ──
function getHighScore() {
  return parseInt(localStorage.getItem('snakeHS') || '0');
}

function setHighScore(v) {
  localStorage.setItem('snakeHS', v);
}

highScoreDisplay.textContent = getHighScore();
highScoreGame.textContent = getHighScore();

// ── Screen Management ──
function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[id].classList.add('active');
}

// ── Game Initialization ──
function initGame() {
  const cfg = MAP_CONFIGS[settings.mapSize];
  const cellSize = cfg.cell;
  const cols = cfg.cols;
  const rows = cfg.rows;

  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;

  // Limit canvas display size on small screens
  const maxW = Math.min(window.innerWidth - 32, 600);
  const scale = Math.min(1, maxW / canvas.width);
  canvas.style.width = (canvas.width * scale) + 'px';
  canvas.style.height = (canvas.height * scale) + 'px';

  const startX = Math.floor(cols / 2);
  const startY = Math.floor(rows / 2);

  state = {
    snake: [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: null,
    powerupItem: null,
    specialFruits: [],    // active special fruits on field
    fieldItem: null,      // collectable usable item on field
    inventory: [],        // held usable items (max 3 slots)
    score: 0,
    apples: 0,
    paused: false,
    dead: false,
    mode: settings.mode,
    skin: settings.skin,
    cols,
    rows,
    cellSize,
    portals: [],
    effects: {},
    speedMs: SPEED_MS[settings.speed],
    pendingGrow: 0,       // extra segments to grow (orange effect)
  };

  activeEffects = {};
  notifications = [];
  if (specialFruitTimer) { clearTimeout(specialFruitTimer); specialFruitTimer = null; }
  if (itemFieldTimer)    { clearTimeout(itemFieldTimer);    itemFieldTimer = null; }

  // Spawn portals for portal mode
  if (settings.mode === 'portal') {
    spawnPortals();
  }

  spawnFood();
  modeBadge.textContent = MODE_LABELS[settings.mode];
  highScoreGame.textContent = getHighScore();
  updateScore(0);
  powerupSlots.innerHTML = '';
  updateInventoryUI();

  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(tick, state.speedMs);

  // Schedule special fruit spawning
  function scheduleNextSpecialFruit() {
    if (state.dead) return;
    specialFruitTimer = setTimeout(() => {
      if (!state.dead && !state.paused) spawnSpecialFruit();
      scheduleNextSpecialFruit();
    }, 8000 + Math.random() * 6000);
  }
  specialFruitTimer = setTimeout(() => {
    if (!state.dead) spawnSpecialFruit();
    scheduleNextSpecialFruit();
  }, 5000);

  // Schedule usable item spawning (first at 12s, then every 20–30s)
  function scheduleNextFieldItem() {
    if (state.dead) return;
    itemFieldTimer = setTimeout(() => {
      if (!state.dead && !state.paused) spawnFieldItem();
      scheduleNextFieldItem();
    }, 20000 + Math.random() * 10000);
  }
  itemFieldTimer = setTimeout(() => {
    if (!state.dead) spawnFieldItem();
    scheduleNextFieldItem();
  }, 12000);
}

// ── Portal Spawn ──
function spawnPortals() {
  const positions = [];
  for (let i = 0; i < 2; i++) {
    let p;
    do { p = randomPos(); } while (positions.some(q => q.x === p.x && q.y === p.y));
    positions.push(p);
  }
  state.portals = [
    { x: positions[0].x, y: positions[0].y, color: '#cc00ff' },
    { x: positions[1].x, y: positions[1].y, color: '#ff4400' },
  ];
}

// ── Food & Power-up ──
function randomPos() {
  const { cols, rows, snake, portals, specialFruits, fieldItem } = state;
  let p;
  let tries = 0;
  do {
    p = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    tries++;
  } while (
    tries < 200 &&
    (snake.some(s => s.x === p.x && s.y === p.y) ||
    (portals    && portals.some(pr => pr.x === p.x && pr.y === p.y)) ||
    (specialFruits && specialFruits.some(sf => sf.x === p.x && sf.y === p.y)) ||
    (fieldItem  && fieldItem.x === p.x && fieldItem.y === p.y))
  );
  return p;
}

// ── Field Item (usable) ──
function spawnFieldItem() {
  if (state.dead || state.paused || state.fieldItem) return;
  // Pick a random item type
  const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  const pos = randomPos();
  state.fieldItem = { ...pos, ...type, spawnedAt: Date.now() };
  // Auto-remove
  const fi = state.fieldItem;
  setTimeout(() => { if (state.fieldItem === fi) state.fieldItem = null; }, type.lifeMs);
}

function collectFieldItem() {
  if (!state.fieldItem) return;
  if (state.inventory.length >= 3) return; // full
  state.inventory.push({ ...state.fieldItem });
  state.fieldItem = null;
  updateInventoryUI();
  // Notification
  const item = state.inventory[state.inventory.length - 1];
  showNotification({ emoji: item.emoji, label: item.name, desc: `[${item.key}] 키로 사용!`, color: item.color });
}

function useItem(index) {
  if (state.paused || state.dead) return;
  const item = state.inventory[index];
  if (!item) return;
  state.inventory.splice(index, 1);
  updateInventoryUI();
  showNotification({ emoji: item.emoji, label: item.name, desc: item.desc, color: item.color });

  switch (item.id) {
    case 'bomb': {
      // Remove bottom half of snake (keep at least 3 segments)
      const half = Math.floor(state.snake.length / 2);
      const keep = Math.max(3, state.snake.length - half);
      state.snake.splice(keep);
      break;
    }
    case 'timeslow': {
      if (!activeEffects.itemSlow) {
        clearInterval(gameLoop);
        gameLoop = setInterval(tick, Math.min(350, state.speedMs * 2));
      }
      activeEffects.itemSlow = true;
      clearTimeout(activeEffects._itemSlowTimer);
      activeEffects._itemSlowTimer = setTimeout(() => {
        delete activeEffects.itemSlow;
        if (!activeEffects.fast && !activeEffects.slow) {
          clearInterval(gameLoop);
          gameLoop = setInterval(tick, state.speedMs);
        }
      }, 5000);
      break;
    }
    case 'teleport': {
      if (!state.food) break;
      // Find a safe cell adjacent to the food
      const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
      const safe = dirs.map(d => ({
        x: (state.food.x + d.x + state.cols) % state.cols,
        y: (state.food.y + d.y + state.rows) % state.rows,
      })).find(c => !state.snake.some(s => s.x === c.x && s.y === c.y));
      if (safe) {
        state.snake[0] = { ...safe };
        // Set direction toward food
        const dx = state.food.x - safe.x;
        const dy = state.food.y - safe.y;
        if (Math.abs(dx) >= Math.abs(dy)) state.dir = state.nextDir = { x: Math.sign(dx), y: 0 };
        else state.dir = state.nextDir = { x: 0, y: Math.sign(dy) };
      }
      break;
    }
  }
}

function updateInventoryUI() {
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`invSlot${i}`);
    if (!slot) continue;
    const item = state.inventory ? state.inventory[i] : null;
    if (item) {
      slot.className = 'inv-slot filled';
      slot.style.setProperty('--ic', item.color);
      slot.innerHTML = `<span class="inv-emoji">${item.emoji}</span><span class="inv-key">${item.key}</span>`;
      slot.title = `${item.name}: ${item.desc}`;
    } else {
      slot.className = 'inv-slot empty';
      slot.style.setProperty('--ic', 'rgba(255,255,255,0.08)');
      slot.innerHTML = `<span class="inv-key-empty">${['Q','Z','X'][i]}</span>`;
      slot.title = '';
    }
  }
}

function spawnFood() {
  state.food = randomPos();
  // 10% chance to spawn powerup alongside food
  if (!state.powerupItem && Math.random() < 0.10) {
    let p;
    do { p = randomPos(); } while (p.x === state.food.x && p.y === state.food.y);
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    state.powerupItem = { ...p, ...type };
  }
}

// ── Special Fruit Spawn ──
function spawnSpecialFruit() {
  if (state.dead || state.paused) return;
  // max 2 special fruits on field at once
  if (state.specialFruits.length >= 2) return;

  // Pick a random fruit type not already on field
  const existing = state.specialFruits.map(sf => sf.id);
  const available = SPECIAL_FRUITS.filter(f => !existing.includes(f.id));
  if (available.length === 0) return;

  const type = available[Math.floor(Math.random() * available.length)];
  const pos = randomPos();
  const sfruit = {
    ...pos,
    ...type,
    spawnedAt: Date.now(),
  };
  state.specialFruits.push(sfruit);

  // Auto-remove after lifeMs
  setTimeout(() => {
    state.specialFruits = state.specialFruits.filter(sf => sf !== sfruit);
  }, type.lifeMs);
}

// ── Apply Special Fruit Effect ──
function applySpecialFruitEffect(fruit) {
  const mult = activeEffects.double ? 2 : 1;
  updateScore(state.score + fruit.points * mult);
  flashScore();
  showNotification(fruit);

  switch (fruit.effect) {
    case 'slow': {
      // Slow down by 40% for duration
      if (!activeEffects.slow) {
        clearInterval(gameLoop);
        gameLoop = setInterval(tick, Math.min(300, state.speedMs * 1.7));
      }
      activeEffects.slow = true;
      clearTimeout(activeEffects._slowTimer);
      activeEffects._slowTimer = setTimeout(() => {
        delete activeEffects.slow;
        if (!activeEffects.fast) {
          clearInterval(gameLoop);
          gameLoop = setInterval(tick, state.speedMs);
        }
      }, fruit.duration);
      break;
    }
    case 'bonus': {
      // Already added points above — do a big score flash
      for (let i = 0; i < 3; i++) setTimeout(flashScore, i * 120);
      break;
    }
    case 'grow3': {
      // Grow 3 extra segments on next 3 ticks
      state.pendingGrow = (state.pendingGrow || 0) + 3;
      break;
    }
    case 'immune': {
      activeEffects.immune = true;
      clearTimeout(activeEffects._immuneTimer);
      activeEffects._immuneTimer = setTimeout(() => {
        delete activeEffects.immune;
      }, fruit.duration);
      break;
    }
    case 'reverse': {
      // Reverse the snake body order and flip direction
      state.snake.reverse();
      state.dir = { x: -state.dir.x, y: -state.dir.y };
      state.nextDir = { ...state.dir };
      break;
    }
  }
}

// ── Tick ──
function tick() {
  if (state.paused || state.dead) return;

  state.dir = { ...state.nextDir };
  const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };

  // Boundary check
  if (state.mode === 'noBorder' || state.mode === 'portal') {
    head.x = (head.x + state.cols) % state.cols;
    head.y = (head.y + state.rows) % state.rows;
  } else if (state.mode !== 'peace') {
    if (head.x < 0 || head.x >= state.cols || head.y < 0 || head.y >= state.rows) {
      if (!activeEffects.immune) { endGame(); return; }
      head.x = Math.max(0, Math.min(state.cols - 1, head.x));
      head.y = Math.max(0, Math.min(state.rows - 1, head.y));
    }
  } else {
    // Peace mode wraps
    head.x = (head.x + state.cols) % state.cols;
    head.y = (head.y + state.rows) % state.rows;
  }

  // Portal teleport
  if (state.mode === 'portal' && state.portals.length === 2) {
    const p0 = state.portals[0], p1 = state.portals[1];
    if (head.x === p0.x && head.y === p0.y) {
      head.x = p1.x + state.dir.x;
      head.y = p1.y + state.dir.y;
      head.x = (head.x + state.cols) % state.cols;
      head.y = (head.y + state.rows) % state.rows;
    } else if (head.x === p1.x && head.y === p1.y) {
      head.x = p0.x + state.dir.x;
      head.y = p0.y + state.dir.y;
      head.x = (head.x + state.cols) % state.cols;
      head.y = (head.y + state.rows) % state.rows;
    }
  }

  // Self-collision
  if (state.mode !== 'peace' && !activeEffects.immune) {
    if (state.snake.some(s => s.x === head.x && s.y === head.y)) {
      endGame(); return;
    }
  }

  state.snake.unshift(head);
  let grew = false;

  // Eat apple (base food)
  if (state.food && head.x === state.food.x && head.y === state.food.y) {
    const mult = activeEffects.double ? 2 : 1;
    updateScore(state.score + 10 * mult);
    state.apples++;
    grew = true;
    spawnFood();
    flashScore();
  }

  // Eat powerup item
  if (state.powerupItem && head.x === state.powerupItem.x && head.y === state.powerupItem.y) {
    applyPowerup(state.powerupItem);
    state.powerupItem = null;
  }

  // Collect field item (add to inventory)
  if (state.fieldItem && head.x === state.fieldItem.x && head.y === state.fieldItem.y) {
    collectFieldItem();
  }

  // Eat special fruits
  const eatenIdx = state.specialFruits.findIndex(sf => sf.x === head.x && sf.y === head.y);
  if (eatenIdx !== -1) {
    const fruit = state.specialFruits.splice(eatenIdx, 1)[0];
    applySpecialFruitEffect(fruit);
    grew = true; // always grow at least 1 when eating a fruit
  }

  // Orange pending grow segments
  if (state.pendingGrow > 0) {
    grew = true;
    state.pendingGrow--;
  }

  if (!grew) state.snake.pop();

  // Tick notifications
  const now = Date.now();
  notifications = notifications.filter(n => now - n.born < n.totalLife);

  draw();
}

// ── Power-ups ──
function applyPowerup(pu) {
  // Add to HUD
  const slot = document.createElement('div');
  slot.className = 'powerup-slot';
  slot.textContent = pu.emoji;
  slot.title = pu.name;
  powerupSlots.appendChild(slot);
  setTimeout(() => slot.remove(), pu.duration || 2000);

  if (pu.effect === 'shrink') {
    // Remove last 3 segments
    state.snake.splice(Math.max(1, state.snake.length - 3));
    return;
  }

  if (pu.duration > 0) {
    activeEffects[pu.effect] = true;
    if (pu.effect === 'fast') {
      clearInterval(gameLoop);
      gameLoop = setInterval(tick, Math.max(40, state.speedMs * 0.5));
    }
    setTimeout(() => {
      delete activeEffects[pu.effect];
      if (pu.effect === 'fast') {
        clearInterval(gameLoop);
        gameLoop = setInterval(tick, state.speedMs);
      }
    }, pu.duration);
  }
}

// ── Drawing ──
function draw() {
  const { cols, rows, cellSize, snake, food, powerupItem, portals, specialFruits } = state;
  const skin = SKINS[state.skin];
  const C = cellSize;
  const now = Date.now();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle dark grid lines (Google style)
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * C, 0);
    ctx.lineTo(x * C, rows * C);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * C);
    ctx.lineTo(cols * C, y * C);
    ctx.stroke();
  }

  // Draw portals
  if (portals && portals.length === 2) {
    portals.forEach((p) => {
      const px = p.x * C + C/2;
      const py = p.y * C + C/2;
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, C/2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(px, py, C/4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Draw apple (base food)
  if (food) {
    const fx = food.x * C + C/2;
    const fy = food.y * C + C/2;
    const r = (C/2 - 3) * (0.88 + 0.12 * Math.sin(now / 220));
    ctx.save();
    // Google red apple - no heavy glow
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(234,67,53,0.4)';
    ctx.fillStyle = '#EA4335';
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = Math.max(1, C * 0.07);
    ctx.beginPath();
    ctx.moveTo(fx, fy - r);
    ctx.quadraticCurveTo(fx + r*0.4, fy - r*1.3, fx + r*0.6, fy - r*1.1);
    ctx.stroke();
    // Leaf
    ctx.fillStyle = '#34A853';
    ctx.beginPath();
    ctx.ellipse(fx + r*0.35, fy - r*1.15, r*0.2, r*0.12, -0.6, 0, Math.PI*2);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(fx - r*0.28, fy - r*0.28, r*0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw powerup item
  if (powerupItem) {
    const px = powerupItem.x * C;
    const py = powerupItem.y * C;
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = powerupItem.color;
    ctx.fillStyle = powerupItem.color + '33';
    roundRect(ctx, px + 2, py + 2, C - 4, C - 4, 6);
    ctx.fill();
    ctx.font = `${Math.floor(C * 0.55)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(powerupItem.emoji, px + C/2, py + C/2);
    ctx.restore();
  }

  // ── Draw Field Item (usable) ──
  if (state.fieldItem) {
    const fi = state.fieldItem;
    const elapsed = now - fi.spawnedAt;
    const remaining = fi.lifeMs - elapsed;
    const blinkPhase = remaining < 3000 && Math.floor(now / 250) % 2 === 1;
    if (!blinkPhase) {
      const px = fi.x * C;
      const py = fi.y * C;
      const pulse = 0.88 + 0.12 * Math.sin(now / 160);
      ctx.save();
      // Outer diamond glow
      ctx.shadowBlur = 28;
      ctx.shadowColor = fi.glowColor;
      ctx.fillStyle = fi.bgColor;
      // Diamond shape
      ctx.beginPath();
      const hw = C / 2 - 2;
      ctx.moveTo(px + C/2, py + 2);
      ctx.lineTo(px + C - 2, py + C/2);
      ctx.lineTo(px + C/2, py + C - 2);
      ctx.lineTo(px + 2, py + C/2);
      ctx.closePath();
      ctx.fill();
      // Animated border
      ctx.strokeStyle = fi.color;
      ctx.lineWidth = Math.max(1.5, C * 0.07);
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 130);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Emoji
      ctx.font = `${Math.floor(C * pulse * 0.58)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 12;
      ctx.fillText(fi.emoji, px + C/2, py + C/2 + 1);
      // Key hint
      const keyFs = Math.max(7, C * 0.28);
      ctx.font = `bold ${keyFs}px Outfit, sans-serif`;
      ctx.fillStyle = fi.color;
      ctx.shadowBlur = 0;
      ctx.fillText(`[${fi.key}]`, px + C/2, py + C - keyFs * 0.2);
      // Timer bar
      const barW = (C - 6) * Math.max(0, remaining / fi.lifeMs);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px + 3, py + C - 4, C - 6, 2);
      ctx.fillStyle = fi.color;
      ctx.fillRect(px + 3, py + C - 4, barW, 2);
      ctx.restore();
    }
  }

  // ── Draw Special Fruits ──
  specialFruits.forEach(sf => {
    const px = sf.x * C;
    const py = sf.y * C;
    const elapsed = now - sf.spawnedAt;
    const remaining = sf.lifeMs - elapsed;
    const pulse = 0.85 + 0.15 * Math.sin(now / 180);

    // Blink when < 3s remaining
    if (remaining < 3000) {
      const blinkOn = Math.floor(now / 250) % 2 === 0;
      if (!blinkOn) return;
    }

    ctx.save();
    // Background glow tile
    ctx.shadowBlur = 22;
    ctx.shadowColor = sf.glowColor;
    ctx.fillStyle = sf.bgColor;
    roundRect(ctx, px + 1, py + 1, C - 2, C - 2, Math.floor(C * 0.3));
    ctx.fill();

    // Animated border ring
    ctx.strokeStyle = sf.color;
    ctx.lineWidth = Math.max(1.5, C * 0.06);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now / 150);
    roundRect(ctx, px + 1, py + 1, C - 2, C - 2, Math.floor(C * 0.3));
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Emoji
    ctx.font = `${Math.floor(C * pulse * 0.62)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = sf.glowColor;
    ctx.fillText(sf.emoji, px + C/2, py + C/2 + 1);

    // Life-timer bar at bottom of cell
    const barW = (C - 4) * Math.max(0, remaining / sf.lifeMs);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px + 2, py + C - 5, C - 4, 3);
    ctx.fillStyle = sf.color;
    ctx.fillRect(px + 2, py + C - 5, barW, 3);

    ctx.restore();
  });

  // Draw snake
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const x = seg.x * C;
    const y = seg.y * C;
    const pad = isHead ? 1 : 2;
    const radius = isHead ? Math.floor(C * 0.35) : Math.floor(C * 0.28);

    ctx.save();
    if (isHead) {
      // Light glow for head (Google style: subtle)
      ctx.shadowBlur = 8;
      ctx.shadowColor = skin.glow;
    }

    // Shield shimmer
    if (activeEffects.immune && isHead) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(66,133,244,0.5)';
    }

    // Google Snake: flat solid color (slight shade on body segments)
    const t = i / Math.max(1, snake.length - 1);
    if (isHead) {
      ctx.fillStyle = skin.head;
    } else {
      // Slightly desaturate/darken toward tail like Google does
      ctx.fillStyle = skin.body;
      ctx.globalAlpha = 1 - t * 0.25;
    }
    roundRect(ctx, x + pad, y + pad, C - pad*2, C - pad*2, radius);
    ctx.fill();

    // Head eyes
    if (isHead) {
      const eyeR = Math.max(2, C * 0.11);
      const { eyeX1, eyeY1, eyeX2, eyeY2 } = getEyePositions(seg, C, eyeR);
      ctx.shadowBlur = 0;
      // Dark pupils
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(eyeX1, eyeY1, eyeR, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX2, eyeY2, eyeR, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#202124';
      ctx.beginPath(); ctx.arc(eyeX1, eyeY1, eyeR*0.55, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeX2, eyeY2, eyeR*0.55, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  });

  // Active effect HUD (Google style: dark text on light bg, top-right corner)
  const hudEffects = [];
  if (activeEffects.double)   hudEffects.push({ label: '×2',          color: '#E37400', bg: 'rgba(251,188,4,0.1)' });
  if (activeEffects.slow)     hudEffects.push({ label: '🐢 SLOW',     color: '#C5221F', bg: 'rgba(234,67,53,0.08)' });
  if (activeEffects.immune)   hudEffects.push({ label: '🛡 SHIELD',   color: '#1967D2', bg: 'rgba(66,133,244,0.08)' });
  if (activeEffects.itemSlow) hudEffects.push({ label: '⏱ SLOW ×2',  color: '#1967D2', bg: 'rgba(66,133,244,0.08)' });

  if (hudEffects.length > 0) {
    ctx.save();
    hudEffects.forEach((hud, i) => {
      const fs = Math.max(10, C * 0.42);
      const pad = 5;
      ctx.font = `bold ${fs}px Roboto, sans-serif`;
      const tw = ctx.measureText(hud.label).width;
      const bx = canvas.width - tw - pad*2 - 8;
      const by = 8 + i * (fs + pad * 2 + 4);
      // Badge bg
      ctx.fillStyle = hud.bg;
      roundRect(ctx, bx, by, tw + pad*2, fs + pad*1.4, 6);
      ctx.fill();
      // Text
      ctx.fillStyle = hud.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hud.label, bx + (tw + pad*2)/2, by + (fs + pad*1.4)/2);
    });
    ctx.restore();
  }

  // ── Draw Floating Notifications (Google style: white cards) ──
  notifications.forEach(n => {
    const age = now - n.born;
    const t = age / n.totalLife;
    const alpha = t < 0.12 ? t / 0.12 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    n.y += n.vy;

    ctx.save();
    ctx.globalAlpha = alpha;

    const fontSize = Math.max(12, C * 0.52);
    const padding  = fontSize * 0.45;
    ctx.font = `700 ${fontSize}px Roboto, sans-serif`;
    const labelW = ctx.measureText(`${n.emoji} ${n.label}`).width;
    const descFs  = Math.max(9, C * 0.34);
    ctx.font = `400 ${descFs}px Roboto, sans-serif`;
    const descW = ctx.measureText(n.desc).width;
    const cardW = Math.max(labelW, descW) + padding * 2 + 8;
    const cardH = fontSize + descFs + padding * 1.5;
    const cardX = n.x - cardW / 2;
    const cardY = n.y - cardH / 2;

    // White card with colored border (Google Material style)
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.shadowBlur = 16;
    ctx.shadowColor = 'rgba(60,64,67,0.25)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 2.5;
    roundRect(ctx, cardX, cardY, cardW, cardH, 10);
    ctx.stroke();

    // Label
    ctx.font = `700 ${fontSize}px Roboto, sans-serif`;
    ctx.fillStyle = n.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${n.emoji} ${n.label}`, n.x, cardY + padding * 0.5);

    // Desc
    ctx.font = `400 ${descFs}px Roboto, sans-serif`;
    ctx.fillStyle = '#5F6368';
    ctx.fillText(n.desc, n.x, cardY + padding * 0.5 + fontSize + 2);

    ctx.restore();
  });
}

function getEyePositions(head, C, r) {
  const cx = head.x * C + C/2;
  const cy = head.y * C + C/2;
  const off = C * 0.22;
  const fwd = C * 0.15;
  const { x, y } = state.dir;
  return {
    eyeX1: cx + x*fwd - y*off,
    eyeY1: cy + y*fwd + x*off,
    eyeX2: cx + x*fwd + y*off,
    eyeY2: cy + y*fwd - x*off,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ── Score ──
function updateScore(val) {
  state.score = val;
  scoreDisplay.textContent = val;
}

function flashScore() {
  scoreDisplay.classList.remove('pop');
  void scoreDisplay.offsetWidth; // reflow
  scoreDisplay.classList.add('pop');
  setTimeout(() => scoreDisplay.classList.remove('pop'), 200);
}

// ── End Game ──
function endGame() {
  clearInterval(gameLoop);
  gameLoop = null;
  if (specialFruitTimer) { clearTimeout(specialFruitTimer); specialFruitTimer = null; }
  if (itemFieldTimer)    { clearTimeout(itemFieldTimer);    itemFieldTimer = null; }
  state.dead = true;

  const hs = getHighScore();
  const isNew = state.score > hs;
  if (isNew) setHighScore(state.score);

  document.getElementById('finalScore').textContent = state.score;
  document.getElementById('finalHighScore').textContent = isNew ? state.score : hs;
  document.getElementById('finalApples').textContent = state.apples;
  document.getElementById('newRecordBadge').style.display = isNew ? 'block' : 'none';

  const isWin = state.mode === 'peace';
  document.getElementById('gameOverEmoji').textContent = isWin ? '🎉' : '💀';
  document.getElementById('gameOverTitle').textContent = isWin ? '클리어!' : '게임 오버';

  highScoreDisplay.textContent = getHighScore();

  setTimeout(() => showScreen('over'), 300);
}

// ── Input ──
const DIR_MAP = {
  ArrowUp:    { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown:  { x: 0, y: 1  }, s: { x: 0, y: 1  }, S: { x: 0, y: 1  },
  ArrowLeft:  { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0  }, d: { x: 1, y: 0  }, D: { x: 1, y: 0  },
};

document.addEventListener('keydown', e => {
  if (!screens.game.classList.contains('active')) return;
  if (e.key === ' ' || e.key === 'Escape') { togglePause(); return; }

  // Inventory use keys
  if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); useItem(0); return; }
  if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); useItem(1); return; }
  if (e.key === 'x' || e.key === 'X') { e.preventDefault(); useItem(2); return; }

  const dir = DIR_MAP[e.key];
  if (!dir) return;
  e.preventDefault();
  if (dir.x !== -state.dir.x || dir.y !== -state.dir.y) {
    state.nextDir = dir;
  }
});

// Touch controls
let touchStart = null;
canvas.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx < 10 && ady < 10) return;
  let dir;
  if (adx > ady) dir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  else           dir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  if (dir.x !== -state.dir.x || dir.y !== -state.dir.y) {
    state.nextDir = dir;
  }
  touchStart = null;
}, { passive: true });

// ── Pause ──
function togglePause() {
  state.paused = !state.paused;
  pauseOverlay.classList.toggle('visible', state.paused);
}

document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('menuFromPause').addEventListener('click', () => {
  clearInterval(gameLoop); gameLoop = null;
  showScreen('main');
});

// ── Button Handlers ──
document.getElementById('playBtn').addEventListener('click', () => {
  showScreen('game');
  setTimeout(() => initGame(), 50);
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  showScreen('game');
  setTimeout(() => initGame(), 50);
});

document.getElementById('menuBtn').addEventListener('click', () => {
  showScreen('main');
  highScoreDisplay.textContent = getHighScore();
});

// ── Animation Loop for food pulsing ──
function animLoop() {
  if (screens.game.classList.contains('active') && !state.paused && !state.dead) {
    draw();
  }
  requestAnimationFrame(animLoop);
}
requestAnimationFrame(animLoop);

// ── Init ──
showScreen('main');
