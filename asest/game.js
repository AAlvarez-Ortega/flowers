const game = document.getElementById("game");
const player = document.getElementById("player");
const playerSprite = document.getElementById("player-sprite");
const boss = document.getElementById("boss");
const bossSprite = document.getElementById("boss-sprite");
const scoreElement = document.getElementById("score");
const scoreGoal = document.getElementById("score-goal");
const levelLabel = document.getElementById("level-label");
const gameTitle = document.getElementById("game-title");
const pointMessage = document.getElementById("point-message");
const startScreen = document.getElementById("start-screen");
const introScreen = document.getElementById("intro-screen");
const introText = document.getElementById("intro-text");
const winScreen = document.getElementById("win-screen");
const defeatedStage = document.getElementById("defeated-stage");
const flowerStage = document.getElementById("flower-stage");
const flowerButton = document.getElementById("flower-button");
const flowerSprite = document.getElementById("flower-sprite");
const flowerHint = document.getElementById("flower-hint");
const giftMessage = document.getElementById("gift-message");
const loseScreen = document.getElementById("lose-screen");
const playButton = document.getElementById("play-button");
const restartButton = document.getElementById("restart-button");
const retryButton = document.getElementById("retry-button");
const leftButton = document.getElementById("left-button");
const rightButton = document.getElementById("right-button");
const soundButton = document.getElementById("sound-button");
const music = document.getElementById("music");
const bossRule = document.getElementById("boss-rule");

const LEVEL_ONE_GOAL = 500;
const FINAL_GOAL = 1000;
const PLAYER_SPEED = 370;
const INTRO_DURATION = 7000;
const POINTS_PER_SPEED_LEVEL = 50;
const FALL_SPEED_INCREASE = 0.15;
const CAT_BASE_CHANCE = 0.05;
const CAT_IMMUNITY_DURATION = 5000;
const BOSS_SPEED = 105;
const COMPUTER_BASE_SPEED = 215;
const OBJECTS = [
    { name: "Tacos", file: "tacos.png", points: 20, weight: 31, size: 36 },
    { name: "Elote", file: "elote.png", points: 10, weight: 31, size: 35 },
    { name: "Sombrero", file: "sombrero.png", points: 15, weight: 28, size: 36 },
    { name: "Gato", file: "gato.png", effect: "immunity", weight: 5, size: 33, fixedSpeed: 175 },
    { name: "Tarro", file: "tarro.png", effect: "speed", weight: 5, size: 31 }
];

let state = "menu";
let level = 1;
let score = 0;
let peakScore = 0;
let playerX = 50;
let bossX = 50;
let bossDirection = 1;
let movingLeft = false;
let movingRight = false;
let facing = "idle";
let walkFrame = 0;
let walkTimer = 0;
let lastFrameTime = performance.now();
let objectInterval = null;
let introTimers = [];
let messageTimer = null;
let boostTimer = null;
let slowTimer = null;
let immunityTimer = null;
let bossAttackTimer = null;
let bossMouthTimer = null;
let finaleTimers = [];
let flowerAnimationTimer = null;
let playerBoosted = false;
let playerSlowed = false;
let playerImmune = false;
let speedMultiplier = 1;

function setPlayerPosition() {
    player.style.left = `${playerX}%`;
}

function setPlayerSprite(direction, elapsed = 0) {
    if (direction === "idle") {
        if (facing !== "idle") playerSprite.src = "asest/player-idle.png";
        facing = "idle";
        walkTimer = 0;
        return;
    }
    walkTimer += elapsed;
    if (direction !== facing || walkTimer >= 150) {
        walkFrame = walkFrame === 1 ? 2 : 1;
        walkTimer = 0;
        playerSprite.src = `asest/player-${direction}-${walkFrame}.png`;
    }
    facing = direction;
}

function movementLoop(now) {
    const elapsed = Math.min(now - lastFrameTime, 40);
    lastFrameTime = now;

    if (state === "playing") {
        const gameWidth = game.clientWidth || 1;
        const percentStep = (PLAYER_SPEED * speedMultiplier * elapsed / 1000 / gameWidth) * 100;
        let direction = "idle";

        if (movingLeft && !movingRight) {
            playerX -= percentStep;
            direction = "left";
        } else if (movingRight && !movingLeft) {
            playerX += percentStep;
            direction = "right";
        }

        playerX = Math.max(7, Math.min(93, playerX));
        setPlayerPosition();
        setPlayerSprite(direction, elapsed);
    } else {
        setPlayerSprite("idle");
    }

    if (level === 2 && boss.classList.contains("active") && (state === "playing" || state === "level-transition")) {
        moveBoss(elapsed);
    }

    requestAnimationFrame(movementLoop);
}

function moveBoss(elapsed) {
    const gameWidth = game.clientWidth || 1;
    bossX += bossDirection * (BOSS_SPEED * elapsed / 1000 / gameWidth) * 100;
    if (bossX >= 92) {
        bossX = 92;
        bossDirection = -1;
    } else if (bossX <= 8) {
        bossX = 8;
        bossDirection = 1;
    }
    boss.style.left = `${bossX}%`;
}

function setMovement(direction, active) {
    if (direction === "left") movingLeft = active;
    if (direction === "right") movingRight = active;
}

document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "a", "d"].includes(key)) event.preventDefault();
    if (key === "arrowleft" || key === "a") setMovement("left", true);
    if (key === "arrowright" || key === "d") setMovement("right", true);
});
document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") setMovement("left", false);
    if (key === "arrowright" || key === "d") setMovement("right", false);
});
window.addEventListener("blur", () => {
    movingLeft = false;
    movingRight = false;
});

function bindHoldButton(button, direction) {
    button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        setMovement(direction, true);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) => {
        button.addEventListener(name, () => setMovement(direction, false));
    });
}
bindHoldButton(leftButton, "left");
bindHoldButton(rightButton, "right");

function getFallSpeedMultiplier() {
    const speedLevel = Math.floor(peakScore / POINTS_PER_SPEED_LEVEL);
    return 1 + speedLevel * FALL_SPEED_INCREASE;
}

function pickObject() {
    const cat = OBJECTS.find((item) => item.effect === "immunity");
    const catChance = Math.min(0.35, CAT_BASE_CHANCE * getFallSpeedMultiplier());
    if (Math.random() < catChance) return cat;

    const remainingObjects = OBJECTS.filter((item) => item !== cat);
    const totalWeight = remainingObjects.reduce((sum, item) => sum + item.weight, 0);
    let choice = Math.random() * totalWeight;
    return remainingObjects.find((item) => (choice -= item.weight) <= 0) || remainingObjects[0];
}

function createFallingObject() {
    if (state !== "playing") return;
    const data = pickObject();
    const object = document.createElement("div");
    const image = document.createElement("img");
    const maxX = Math.max(0, game.clientWidth - data.size);

    object.className = `falling-object ${data.effect ? "effect-object" : "reward"}`;
    object.style.width = `${data.size}px`;
    object.style.height = `${data.size}px`;
    object.style.left = `${Math.random() * maxX}px`;
    object.style.top = `${-data.size}px`;
    image.src = `asest/${data.file}`;
    image.alt = data.name;
    image.draggable = false;
    object.appendChild(image);
    game.appendChild(object);
    animateObject(object, data, -data.size, data.fixedSpeed || 145 + Math.random() * 90);
}

function animateObject(object, data, y, speed) {
    let previous = performance.now();

    function fall(now) {
        if (state !== "playing" || !object.isConnected) {
            object.remove();
            return;
        }

        const elapsed = Math.min(now - previous, 40);
        previous = now;
        const fallMultiplier = data.fixedSpeed ? 1 : getFallSpeedMultiplier();
        y += speed * fallMultiplier * elapsed / 1000;
        object.style.top = `${y}px`;

        if (checkCollision(object, player)) {
            collectObject(data);
            object.remove();
            return;
        }
        if (y > game.clientHeight) {
            object.remove();
            return;
        }
        requestAnimationFrame(fall);
    }

    requestAnimationFrame(fall);
}

function checkCollision(first, second) {
    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    const paddingX = b.width * 0.2;
    const paddingY = b.height * 0.08;
    return !(a.bottom < b.top + paddingY || a.top > b.bottom || a.right < b.left + paddingX || a.left > b.right - paddingX);
}

function changeScore(points, showMessage = true) {
    const previousSpeedLevel = Math.floor(peakScore / POINTS_PER_SPEED_LEVEL);
    score = Math.max(0, Math.min(FINAL_GOAL, score + points));
    peakScore = Math.max(peakScore, score);
    const currentSpeedLevel = Math.floor(peakScore / POINTS_PER_SPEED_LEVEL);

    scoreElement.textContent = score;
    if (showMessage) showPointMessage(`${points > 0 ? "+" : ""}${points}`, points > 0);
    if (currentSpeedLevel > previousSpeedLevel && score < FINAL_GOAL) showSpeedLevelUp();

    if (level === 1 && score >= LEVEL_ONE_GOAL) {
        beginLevelTwoTransition();
    } else if (level === 2 && score >= FINAL_GOAL) {
        winGame();
    }
}

function showSpeedLevelUp() {
    game.classList.remove("speed-level-up");
    void game.offsetWidth;
    game.classList.add("speed-level-up");
    setTimeout(() => {
        if (state === "playing") showPointMessage("VELOCIDAD ↑", true);
        game.classList.remove("speed-level-up");
    }, 350);
}

function collectObject(data) {
    if (data.effect === "immunity") {
        applyCatImmunity();
        return;
    }
    if (data.effect === "speed") {
        applySpeedEffect();
        return;
    }
    changeScore(data.points);
}

function recalculatePlayerSpeed() {
    speedMultiplier = (playerBoosted ? 2 : 1) * (playerSlowed ? 0.5 : 1);
}

function applySpeedEffect() {
    clearTimeout(boostTimer);
    playerBoosted = true;
    player.classList.add("speed-boost");
    recalculatePlayerSpeed();
    showPointMessage("VELOCIDAD ×2", true);
    boostTimer = setTimeout(() => {
        playerBoosted = false;
        player.classList.remove("speed-boost");
        recalculatePlayerSpeed();
    }, 3000);
}

function applyCatImmunity() {
    clearTimeout(immunityTimer);
    playerImmune = true;
    player.classList.add("immune");
    showPointMessage("¡INMUNE!", true);
    immunityTimer = setTimeout(() => {
        playerImmune = false;
        player.classList.remove("immune");
    }, CAT_IMMUNITY_DURATION);
}

function applyComputerSlow() {
    clearTimeout(slowTimer);
    playerSlowed = true;
    player.classList.add("slowed");
    recalculatePlayerSpeed();
    showPointMessage("−20 · LENTA 5 S", false);
    slowTimer = setTimeout(() => {
        playerSlowed = false;
        player.classList.remove("slowed");
        recalculatePlayerSpeed();
    }, 5000);
}

function clearPlayerEffects() {
    clearTimeout(boostTimer);
    clearTimeout(slowTimer);
    clearTimeout(immunityTimer);
    boostTimer = null;
    slowTimer = null;
    immunityTimer = null;
    playerBoosted = false;
    playerSlowed = false;
    playerImmune = false;
    speedMultiplier = 1;
    player.classList.remove("speed-boost", "slowed", "immune");
}

function showPointMessage(text, positive) {
    clearTimeout(messageTimer);
    pointMessage.textContent = text;
    pointMessage.className = positive ? "points-positive" : "points-negative";
    messageTimer = setTimeout(() => { pointMessage.className = ""; }, 650);
}

function clearFallingObjects() {
    document.querySelectorAll(".falling-object, .computer-projectile, .confetti").forEach((item) => item.remove());
}

function showIntroLine(text, modifier = "") {
    introText.className = "";
    void introText.offsetWidth;
    introText.textContent = text;
    introText.className = `show ${modifier}`.trim();
}

function clearIntroTimers() {
    introTimers.forEach(clearTimeout);
    introTimers = [];
}

function clearBossAttack() {
    clearTimeout(bossAttackTimer);
    clearTimeout(bossMouthTimer);
    bossAttackTimer = null;
    bossMouthTimer = null;
    bossSprite.src = "asest/jefa-boca cerrada.png";
}

function clearFinale() {
    finaleTimers.forEach(clearTimeout);
    finaleTimers = [];
    clearInterval(flowerAnimationTimer);
    flowerAnimationTimer = null;
    defeatedStage.classList.remove("active");
    flowerStage.classList.remove("active");
    flowerButton.classList.remove("opening", "bloomed");
    flowerButton.disabled = false;
    flowerSprite.src = "asest/flor 1.png";
    flowerSprite.alt = "Flor amarilla cerrada";
    flowerHint.classList.remove("hidden");
    giftMessage.classList.remove("active");
    restartButton.classList.remove("active");
}

function beginGame() {
    clearIntroTimers();
    clearInterval(objectInterval);
    clearBossAttack();
    clearFinale();
    clearPlayerEffects();
    clearFallingObjects();

    state = "intro";
    level = 1;
    score = 0;
    peakScore = 0;
    playerX = 50;
    bossX = 50;
    bossDirection = 1;
    movingLeft = false;
    movingRight = false;

    scoreElement.textContent = "0";
    scoreGoal.textContent = "/500";
    levelLabel.textContent = "NIVEL 1 · PIXEL CHALLENGE";
    gameTitle.textContent = "La prueba de los 500";
    setPlayerPosition();
    boss.style.left = "50%";
    boss.className = "boss";
    bossRule.classList.remove("active");
    playerSprite.src = "asest/player-idle.png";
    startScreen.classList.remove("active");
    winScreen.classList.remove("active");
    loseScreen.classList.remove("active");
    introScreen.className = "screen active";

    showIntroLine("VEAMOS QUÉ TAN BUENA ERES");
    introTimers.push(setTimeout(() => showIntroLine("CONSIGUE 500 PUNTOS"), 3000));
    introTimers.push(setTimeout(() => showIntroLine("¡YA!", "go"), 6000));
    introTimers.push(setTimeout(startLevelOne, INTRO_DURATION));
}

function startLevelOne() {
    introScreen.classList.remove("active");
    introText.className = "";
    state = "playing";
    createFallingObject();
    objectInterval = setInterval(createFallingObject, 720);
}

function beginLevelTwoTransition() {
    if (state !== "playing" || level !== 1) return;

    state = "level-transition";
    level = 2;
    clearInterval(objectInterval);
    clearFallingObjects();
    clearPlayerEffects();
    clearIntroTimers();

    scoreGoal.textContent = "/1000";
    levelLabel.textContent = "NIVEL 2 · BOSS";
    gameTitle.textContent = "Vence a tu jefa";
    bossRule.classList.add("active");
    introScreen.className = "screen active boss-intro";
    showIntroLine("¿DEMACIADO FÁCIL?");

    introTimers.push(setTimeout(() => {
        showIntroLine("VENCE A TU JEFA DEL TRABAJO");
        boss.classList.add("active", "intro-visible");
    }, 2800));
    introTimers.push(setTimeout(startLevelTwo, 6000));
}

function startLevelTwo() {
    introScreen.className = "screen";
    introText.className = "";
    boss.classList.remove("intro-visible");
    boss.classList.add("active");
    state = "playing";
    createFallingObject();
    objectInterval = setInterval(createFallingObject, 720);
    scheduleBossAttack();
}

function getBossAttackLevel() {
    return Math.max(0, Math.floor((peakScore - LEVEL_ONE_GOAL) / 100));
}

function getBossAttackDelay() {
    return Math.max(650, 1800 - getBossAttackLevel() * 200);
}

function scheduleBossAttack() {
    clearTimeout(bossAttackTimer);
    if (state !== "playing" || level !== 2) return;
    bossAttackTimer = setTimeout(performBossAttack, getBossAttackDelay());
}

function performBossAttack() {
    if (state !== "playing" || level !== 2) return;
    bossSprite.src = "asest/jefa boca abierta.png";

    bossMouthTimer = setTimeout(() => {
        if (state !== "playing" || level !== 2) return;
        launchComputer();
        bossSprite.src = "asest/jefa-boca cerrada.png";
        scheduleBossAttack();
    }, 280);
}

function launchComputer() {
    const projectile = document.createElement("div");
    const image = document.createElement("img");
    const gameRect = game.getBoundingClientRect();
    const bossRect = boss.getBoundingClientRect();
    const width = 48;
    const randomOffset = (Math.random() - 0.5) * 70;
    const x = Math.max(0, Math.min(game.clientWidth - width, bossRect.left - gameRect.left + bossRect.width / 2 - width / 2 + randomOffset));
    const y = bossRect.bottom - gameRect.top - 18;

    projectile.className = "computer-projectile";
    projectile.style.left = `${x}px`;
    projectile.style.top = `${y}px`;
    image.src = "asest/computadora.png";
    image.alt = "Computadora";
    image.draggable = false;
    projectile.appendChild(image);
    game.appendChild(projectile);

    const attackSpeed = COMPUTER_BASE_SPEED * (1 + getBossAttackLevel() * 0.15);
    animateComputer(projectile, y, attackSpeed);
}

function animateComputer(projectile, y, speed) {
    let previous = performance.now();

    function fall(now) {
        if (state !== "playing" || level !== 2 || !projectile.isConnected) {
            projectile.remove();
            return;
        }

        const elapsed = Math.min(now - previous, 40);
        previous = now;
        y += speed * elapsed / 1000;
        projectile.style.top = `${y}px`;

        if (checkCollision(projectile, player)) {
            if (playerImmune) {
                showPointMessage("¡BLOQUEADO!", true);
            } else {
                changeScore(-20, false);
                applyComputerSlow();
            }
            projectile.remove();
            return;
        }
        if (y > game.clientHeight) {
            projectile.remove();
            return;
        }
        requestAnimationFrame(fall);
    }

    requestAnimationFrame(fall);
}

async function startFromMenu() {
    if (state !== "menu") return;
    music.volume = 0.2;
    music.currentTime = 0;
    try {
        await music.play();
    } catch (error) {
        soundButton.classList.add("muted");
        soundButton.textContent = "×";
        soundButton.setAttribute("aria-pressed", "true");
    }
    beginGame();
}

async function restartFullGame() {
    music.currentTime = 0;
    try {
        await music.play();
    } catch (error) {
        // El juego puede continuar aunque el navegador bloquee el audio.
    }
    beginGame();
}

function stopActiveGame() {
    clearInterval(objectInterval);
    clearIntroTimers();
    clearBossAttack();
    clearPlayerEffects();
    clearFallingObjects();
    movingLeft = false;
    movingRight = false;
}

function winGame() {
    state = "won";
    stopActiveGame();
    boss.className = "boss";
    gameTitle.textContent = "Una flor para ti";
    levelLabel.textContent = "RECOMPENSA FINAL";
    clearFinale();
    winScreen.classList.add("active");
    defeatedStage.classList.add("active");
    finaleTimers.push(setTimeout(() => {
        defeatedStage.classList.remove("active");
        flowerStage.classList.add("active");
    }, 2400));
}

function openFlowerGift() {
    if (state !== "won" || flowerButton.disabled) return;
    flowerButton.disabled = true;
    flowerButton.classList.add("opening");
    flowerHint.classList.add("hidden");
    let frame = 1;

    flowerAnimationTimer = setInterval(() => {
        frame += 1;
        flowerSprite.src = `asest/flor ${frame}.png`;
        flowerSprite.alt = `Flor amarilla abriéndose, etapa ${frame} de 8`;
        flowerButton.classList.remove("frame-pop");
        void flowerButton.offsetWidth;
        flowerButton.classList.add("frame-pop");

        if (frame >= 8) {
            clearInterval(flowerAnimationTimer);
            flowerAnimationTimer = null;
            flowerButton.classList.remove("opening");
            flowerButton.classList.add("bloomed");
            giftMessage.classList.add("active");
            restartButton.classList.add("active");
            createCelebration();
        }
    }, 280);
}

function loseGame() {
    if (state === "won" || state === "lost" || state === "menu") return;
    state = "lost";
    stopActiveGame();
    boss.className = "boss";
    introScreen.className = "screen";
    loseScreen.classList.add("active");
}

function createCelebration() {
    for (let index = 0; index < 42; index += 1) {
        const particle = document.createElement("i");
        particle.className = "confetti";
        particle.textContent = ["✦", "◆", "●"][index % 3];
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 0.8}s`;
        particle.style.animationDuration = `${1.8 + Math.random() * 1.8}s`;
        game.appendChild(particle);
        setTimeout(() => particle.remove(), 4500);
    }
}

soundButton.addEventListener("click", () => {
    if (state === "menu") return;
    music.muted = !music.muted;
    soundButton.classList.toggle("muted", music.muted);
    soundButton.textContent = music.muted ? "×" : "♪";
    soundButton.setAttribute("aria-pressed", String(music.muted));
});
music.addEventListener("ended", () => {
    if (score < FINAL_GOAL) loseGame();
});
playButton.addEventListener("click", startFromMenu);
restartButton.addEventListener("click", restartFullGame);
retryButton.addEventListener("click", restartFullGame);
flowerButton.addEventListener("click", openFlowerGift);

setPlayerPosition();
requestAnimationFrame(movementLoop);
