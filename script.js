const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("scoreText");
const timeText = document.getElementById("timeText");
const inventoryText = document.getElementById("inventoryText");
const messageText = document.getElementById("messageText");
const restartButton = document.getElementById("restartButton");
const guideList = document.getElementById("guideList");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const touchButtons = document.querySelectorAll("[data-key]");

const world = {
  width: 960,
  height: 600,
};

const binTypes = {
  plastic: {
    label: "Plastic",
    color: "#f2c84b",
    fact: "Plastic bottles can be recycled into new containers, bags, and clothing fibers.",
  },
  paper: {
    label: "Paper",
    color: "#4f8fd8",
    fact: "Clean paper can become notebooks, boxes, and newspapers again.",
  },
  organic: {
    label: "Organic",
    color: "#47a968",
    fact: "Food scraps can become compost that helps plants grow.",
  },
  metal: {
    label: "Metal",
    color: "#8d98a7",
    fact: "Metal cans can be melted and reused many times.",
  },
};

const startingTrash = [
  { id: 1, name: "Plastic Bottle", type: "plastic", x: 155, y: 125, color: "#e9d64f" },
  { id: 2, name: "Newspaper", type: "paper", x: 392, y: 118, color: "#eef4f7" },
  { id: 3, name: "Banana Peel", type: "organic", x: 712, y: 172, color: "#f0d84a" },
  { id: 4, name: "Soda Can", type: "metal", x: 227, y: 393, color: "#aab3bd" },
  { id: 5, name: "Notebook Page", type: "paper", x: 560, y: 370, color: "#ffffff" },
  { id: 6, name: "Snack Wrapper", type: "plastic", x: 789, y: 437, color: "#ffca5f" },
  { id: 7, name: "Apple Core", type: "organic", x: 468, y: 505, color: "#ba573f" },
  { id: 8, name: "Tin Lid", type: "metal", x: 812, y: 83, color: "#bfc8cf" },
];

const bins = [
  { type: "organic", x: 80, y: 512, w: 88, h: 58 },
  { type: "paper", x: 190, y: 512, w: 88, h: 58 },
  { type: "plastic", x: 300, y: 512, w: 88, h: 58 },
  { type: "metal", x: 410, y: 512, w: 88, h: 58 },
];

const keys = new Set();
let player;
let trash;
let carriedItem;
let score;
let remainingSeconds;
let gameOver;
let lastTime;
let secondAccumulator;

function resetGame() {
  player = { x: 90, y: 85, size: 34, speed: 210, direction: "down" };
  trash = startingTrash.map((item) => ({ ...item, collected: false, sorted: false }));
  carriedItem = null;
  score = 0;
  remainingSeconds = 90;
  gameOver = false;
  lastTime = performance.now();
  secondAccumulator = 0;
  messageText.textContent = "Use WASD or arrow keys to move. Pick up litter, then visit the matching bin.";
  updateHud();
}

function buildGuide() {
  guideList.innerHTML = "";
  Object.values(binTypes).forEach((type) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="guide-swatch" style="background:${type.color}"></span>
      <span><b>${type.label}</b><small>${type.fact}</small></span>
    `;
    guideList.appendChild(item);
  });
}

function updateHud() {
  scoreText.textContent = score;
  timeText.textContent = remainingSeconds;
  inventoryText.textContent = carriedItem ? carriedItem.name : "Nothing";

  const sortedCount = trash.filter((item) => item.sorted).length;
  const progress = Math.round((sortedCount / trash.length) * 100);
  progressText.textContent = `${progress}%`;
  progressFill.style.width = `${progress}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circlesOverlap(a, b, distance) {
  return Math.hypot(a.x - b.x, a.y - b.y) < distance;
}

function rectContainsPoint(rect, point) {
  return (
    point.x > rect.x &&
    point.x < rect.x + rect.w &&
    point.y > rect.y &&
    point.y < rect.y + rect.h
  );
}

function handlePickup() {
  if (carriedItem || gameOver) {
    return;
  }

  const nearbyTrash = trash.find((item) => !item.collected && circlesOverlap(player, item, 42));
  if (!nearbyTrash) {
    return;
  }

  nearbyTrash.collected = true;
  carriedItem = nearbyTrash;
  messageText.textContent = `Picked up ${nearbyTrash.name}. Take it to the ${binTypes[nearbyTrash.type].label} bin.`;
  updateHud();
}

function handleSorting() {
  if (!carriedItem || gameOver) {
    return;
  }

  const touchedBin = bins.find((bin) => rectContainsPoint(bin, player));
  if (!touchedBin) {
    return;
  }

  const correctType = carriedItem.type === touchedBin.type;
  if (correctType) {
    carriedItem.sorted = true;
    score += 10;
    messageText.textContent = `Correct. ${binTypes[carriedItem.type].fact}`;
    carriedItem = null;
  } else {
    score = Math.max(0, score - 2);
    messageText.textContent = `${carriedItem.name} belongs in the ${binTypes[carriedItem.type].label} bin. Try that one next.`;
  }

  const allSorted = trash.every((item) => item.sorted);
  if (allSorted) {
    gameOver = true;
    messageText.textContent = `Level complete. You cleaned Eco Town with ${remainingSeconds} seconds left.`;
  }

  updateHud();
}

function updatePlayer(deltaSeconds) {
  if (gameOver) {
    return;
  }

  let dx = 0;
  let dy = 0;

  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    player.x += (dx / length) * player.speed * deltaSeconds;
    player.y += (dy / length) * player.speed * deltaSeconds;
    player.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  }

  player.x = clamp(player.x, player.size / 2, world.width - player.size / 2);
  player.y = clamp(player.y, player.size / 2, world.height - player.size / 2);
}

function updateTimer(deltaSeconds) {
  if (gameOver) {
    return;
  }

  secondAccumulator += deltaSeconds;
  if (secondAccumulator >= 1) {
    remainingSeconds = Math.max(0, remainingSeconds - Math.floor(secondAccumulator));
    secondAccumulator %= 1;
    updateHud();
  }

  if (remainingSeconds === 0) {
    gameOver = true;
    messageText.textContent = "Time is up. Restart and try cleaning the town a little faster.";
  }
}

function drawTown() {
  ctx.fillStyle = "#9ecf76";
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#6f7579";
  ctx.fillRect(0, 266, world.width, 74);
  ctx.fillRect(532, 0, 78, world.height);

  ctx.strokeStyle = "#f2e7bc";
  ctx.setLineDash([26, 24]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 303);
  ctx.lineTo(world.width, 303);
  ctx.moveTo(571, 0);
  ctx.lineTo(571, world.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#5ab0c8";
  ctx.fillRect(724, 0, 236, 150);
  ctx.fillStyle = "#e5ce91";
  ctx.fillRect(724, 134, 236, 32);

  drawBuilding(46, 35, 130, 78, "#dd8664", "School");
  drawBuilding(696, 348, 160, 88, "#d6a85c", "Market");
  drawBuilding(262, 44, 120, 82, "#79a7cf", "Library");

  ctx.fillStyle = "#417c4b";
  drawTree(112, 410);
  drawTree(650, 214);
  drawTree(871, 220);
  drawTree(331, 412);
}

function drawBuilding(x, y, w, h, color, label) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(x + 16, y + 18, 24, 20);
  ctx.fillRect(x + w - 42, y + 18, 24, 20);
  ctx.fillStyle = "#263c3d";
  ctx.font = "700 15px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 17);
}

function drawTree(x, y) {
  ctx.fillStyle = "#76533d";
  ctx.fillRect(x - 6, y + 14, 12, 25);
  ctx.fillStyle = "#357c49";
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
}

function drawBins() {
  bins.forEach((bin) => {
    const type = binTypes[bin.type];
    ctx.fillStyle = type.color;
    ctx.fillRect(bin.x, bin.y, bin.w, bin.h);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(bin.x + 8, bin.y - 8, bin.w - 16, 10);
    ctx.fillStyle = "#17313b";
    ctx.font = "700 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(type.label, bin.x + bin.w / 2, bin.y + 36);
  });
}

function drawTrash() {
  const icons = {
    "Plastic Bottle": "\u{1F9F4}",
    "Newspaper": "\u{1F4F0}",
    "Banana Peel": "\u{1F34C}",
    "Soda Can": "\u{1F96B}",
    "Notebook Page": "\u{1F4C4}",
    "Snack Wrapper": "\u{1F36C}",
    "Apple Core": "\u{1F34E}",
    "Tin Lid": "\u{1F96B}",
  };

  trash.forEach((item) => {
    if (item.collected) return;

    ctx.font = '32px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(icons[item.name] || "\u{1F5D1}\uFE0F", item.x, item.y);
  });
}

function drawPlayer() {

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "#315d96";
  ctx.fillRect(-12, -2, 24, 24);
  ctx.fillStyle = "#f0b887";
  ctx.beginPath();
  ctx.arc(0, -18, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#17313b";
  ctx.beginPath();
  ctx.arc(player.direction === "left" ? -6 : 6, -20, 2.5, 0, Math.PI * 2);
  ctx.fill();

 if (carriedItem) {
  const icons = {
    "Plastic Bottle": "\u{1F9F4}",
    "Newspaper": "\u{1F4F0}",
    "Banana Peel": "\u{1F34C}",
    "Soda Can": "\u{1F96B}",
    "Notebook Page": "\u{1F4C4}",
    "Snack Wrapper": "\u{1F36C}",
    "Apple Core": "\u{1F34E}",
    "Tin Lid": "\u{1F96B}",
  };

  ctx.font = '24px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(icons[carriedItem.name] || "\u{1F5D1}\uFE0F", 0, -42);
}

  ctx.restore();
}

function drawOverlay() {
  if (!gameOver) {
    return;
  }

  ctx.fillStyle = "rgba(23, 49, 59, 0.72)";
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "800 42px Arial";
  ctx.fillText(remainingSeconds > 0 ? "Eco Town is clean" : "Try again", world.width / 2, world.height / 2 - 24);
  ctx.font = "700 20px Arial";
  ctx.fillText(`Final score: ${score}`, world.width / 2, world.height / 2 + 18);
}

function draw() {
  drawTown();
  drawBins();
  drawTrash();
  drawPlayer();
  drawOverlay();
}

function gameLoop(now) {
  const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updatePlayer(deltaSeconds);
  updateTimer(deltaSeconds);
  handlePickup();
  handleSorting();
  draw();

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

touchButtons.forEach((button) => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    keys.add(key);
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointerup", () => {
    keys.delete(key);
  });

  button.addEventListener("pointercancel", () => {
    keys.delete(key);
  });
});

restartButton.addEventListener("click", resetGame);

buildGuide();
resetGame();
requestAnimationFrame(gameLoop);
