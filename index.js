// ==========================================
// 1. LYDSYSTEM (Web Audio API)
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    initAudio();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "shoot") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    } 
    else if (type === "explosion") {
        osc.type = "square";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
    } 
    else if (type === "hit") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } 
    else if (type === "levelup") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.08);
        osc.frequency.setValueAtTime(659, now + 0.16);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
    else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    }
}

// ==========================================
// 2. DOM-ELEMENTER & VARIABLER
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreVal = document.getElementById("scoreVal");
const highScoreVal = document.getElementById("highScoreVal");
const livesVal = document.getElementById("livesVal");
const levelVal = document.getElementById("levelVal");

const mainMenu = document.getElementById("mainMenu");
const pauseMenu = document.getElementById("pauseMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const finalStatsText = document.getElementById("finalStatsText");

const startBtn = document.getElementById("startBtn");
const resumeBtn = document.getElementById("resumeBtn");
const quitToMenuBtn = document.getElementById("quitToMenuBtn");
const restartBtn = document.getElementById("restartBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const diffBtns = document.querySelectorAll(".diff-btn");

let gameState = "MENU"; // "MENU", "PLAYING", "PAUSED", "GAMEOVER"
let score = 0;
let highScore = localStorage.getItem("spaceShooterHighScore") || 0;
highScoreVal.textContent = highScore;
let lives = 3;
let level = 1;

let baseEnemySpeed = 2.2;
let currentEnemySpeed = 2.2;
let spawnIntervalTime = 850;
let enemyTimer = null;
let animationId = null;

const player = {
    x: canvas.width / 2 - 21,
    y: canvas.height - 65,
    width: 42,
    height: 42,
    speed: 7,
    color: "#38bdf8"
};

let bullets = [];
let enemies = [];
let particles = [];
let stars = [];

for (let i = 0; i < 80; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 1.5 + 0.5
    });
}

// ==========================================
// 3. MENY- OG KNAPPEHÅNDTERING
// ==========================================
diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        diffBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        baseEnemySpeed = parseFloat(btn.dataset.speed);
        spawnIntervalTime = parseInt(btn.dataset.spawn);
    });
});

soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? "🔊 Lyd: PÅ" : "🔇 Lyd: AV";
    if (soundEnabled) playSound("levelup");
});

startBtn.addEventListener("click", startNewGame);
restartBtn.addEventListener("click", startNewGame);

resumeBtn.addEventListener("click", () => {
    if (gameState === "PAUSED") {
        gameState = "PLAYING";
        pauseMenu.classList.add("hidden");
        enemyTimer = setInterval(spawnEnemy, spawnIntervalTime);
        gameLoop();
    }
});

function returnToMainMenu() {
    gameState = "MENU";
    clearInterval(enemyTimer);
    cancelAnimationFrame(animationId);
    pauseMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    mainMenu.classList.remove("hidden");
    drawBackgroundOnly();
}

quitToMenuBtn.addEventListener("click", returnToMainMenu);
backToMenuBtn.addEventListener("click", returnToMainMenu);

// ==========================================
// 4. TASTATURSTYRING
// ==========================================
const keys = { ArrowLeft: false, ArrowRight: false };

document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    if (e.code === "ArrowRight") keys.ArrowRight = true;

    if (e.code === "Space") {
        e.preventDefault();
        if (gameState === "PLAYING") {
            shootBullet();
        }
    }

    if (e.code === "KeyP" || e.code === "Escape") {
        if (gameState === "PLAYING") {
            gameState = "PAUSED";
            clearInterval(enemyTimer);
            cancelAnimationFrame(animationId);
            pauseMenu.classList.remove("hidden");
        } else if (gameState === "PAUSED") {
            gameState = "PLAYING";
            pauseMenu.classList.add("hidden");
            enemyTimer = setInterval(spawnEnemy, spawnIntervalTime);
            gameLoop();
        }
    }
});

document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
});

// ==========================================
// 5. SPILLMOTOR & LOGIKK
// ==========================================
function startNewGame() {
    initAudio();
    score = 0;
    lives = 3;
    level = 1;
    currentEnemySpeed = baseEnemySpeed;
    bullets = [];
    enemies = [];
    particles = [];
    player.x = canvas.width / 2 - player.width / 2;

    scoreVal.textContent = score;
    livesVal.textContent = lives;
    levelVal.textContent = level;

    mainMenu.classList.add("hidden");
    pauseMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");

    gameState = "PLAYING";
    clearInterval(enemyTimer);
    cancelAnimationFrame(animationId);

    playSound("levelup");
    enemyTimer = setInterval(spawnEnemy, spawnIntervalTime);
    gameLoop();
}

function shootBullet() {
    bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y,
        width: 6,
        height: 16,
        speed: 9.5,
        color: "#facc15"
    });
    playSound("shoot");
}

function spawnEnemy() {
    if (gameState !== "PLAYING") return;
    const size = 36;
    const x = Math.random() * (canvas.width - size);
    const isFast = Math.random() < 0.25;

    enemies.push({
        x: x,
        y: -size,
        width: size,
        height: size,
        speed: isFast ? currentEnemySpeed * 1.55 : currentEnemySpeed,
        color: isFast ? "#fb7185" : "#f43f5e",
        isFast: isFast
    });
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 14; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 7,
            radius: Math.random() * 3 + 1.5,
            color: color,
            alpha: 1
        });
    }
}

function checkCollision(r1, r2) {
    return (
        r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.y + r1.height > r2.y
    );
}

function update() {
    if (gameState !== "PLAYING") return;

    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
    });

    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x + player.width < canvas.width) player.x += player.speed;

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < 0) bullets.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;

        if (checkCollision(player, enemies[i])) {
            createExplosion(player.x + player.width/2, player.y + player.height/2, "#38bdf8");
            enemies.splice(i, 1);
            lives--;
            livesVal.textContent = lives;
            playSound("hit");
            if (lives <= 0) triggerGameOver();
            continue;
        }

        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
            lives--;
            livesVal.textContent = lives;
            playSound("hit");
            if (lives <= 0) triggerGameOver();
            continue;
        }

        let hit = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[j], enemies[i])) {
                createExplosion(enemies[i].x + enemies[i].width/2, enemies[i].y + enemies[i].height/2, enemies[i].color);
                bullets.splice(j, 1);
                hit = true;
                playSound("explosion");

                score += enemies[i].isFast ? 20 : 10;
                scoreVal.textContent = score;

                if (score > highScore) {
                    highScore = score;
                    highScoreVal.textContent = highScore;
                    localStorage.setItem("spaceShooterHighScore", highScore);
                }

                let newLevel = Math.floor(score / 100) + 1;
                if (newLevel > level) {
                    level = newLevel;
                    levelVal.textContent = level;
                    currentEnemySpeed += 0.35;
                    playSound("levelup");
                }
                break;
            }
        }
        if (hit) enemies.splice(i, 1);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    stars.forEach(star => {
        ctx.globalAlpha = star.speed / 2;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;

    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#93c5fd";
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 24, 5, 0, Math.PI * 2);
    ctx.fill();

    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + e.width, e.y);
        ctx.lineTo(e.x + e.width / 2, e.y + e.height);
        ctx.closePath();
        ctx.fill();
    });
}

function drawBackgroundOnly() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    stars.forEach(star => {
        ctx.globalAlpha = star.speed / 2;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;
}

function gameLoop() {
    if (gameState !== "PLAYING") return;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
    gameState = "GAMEOVER";
    clearInterval(enemyTimer);
    cancelAnimationFrame(animationId);
    playSound("gameover");
    finalStatsText.innerHTML = `Sluttpoeng: <strong>${score}</strong> • Nivå nådd: <strong>${level}</strong><br>Rekord: <strong>${highScore}</strong>`;
    gameOverMenu.classList.remove("hidden");
}

drawBackgroundOnly();