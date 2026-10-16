const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const contadorHTML = document.getElementById("contador");
const comboHTML = document.getElementById("combo");
const nivelHTML = document.getElementById("nivel");
const powerupHUD = document.getElementById("powerup-hud");

const window_width = window.innerWidth;
const window_height = window.innerHeight;

canvas.width = window_width;
canvas.height = window_height;

// ============================================================
//  AUDIO
// ============================================================
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    if (type === "kill") {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(320, now);
        o.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(now); o.stop(now + 0.25);
    } else if (type === "bounce") {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(180, now);
        o.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        g.gain.setValueAtTime(0.05, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(now); o.stop(now + 0.1);
    } else if (type === "levelup") {
        [440, 660, 880].forEach((f, i) => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = "triangle"; o.frequency.value = f;
            g.gain.setValueAtTime(0, now + i * 0.1);
            g.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.25);
        });
    } else if (type === "golden") {
        [880, 1174, 1568].forEach((f, i) => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = "triangle"; o.frequency.value = f;
            g.gain.setValueAtTime(0, now + i * 0.05);
            g.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.2);
        });
    } else if (type === "powerup") {
        [523, 659, 784, 1046].forEach((f, i) => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = "square"; o.frequency.value = f;
            g.gain.setValueAtTime(0, now + i * 0.04);
            g.gain.linearRampToValueAtTime(0.08, now + i * 0.04 + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(now + i * 0.04); o.stop(now + i * 0.04 + 0.15);
        });
    } else if (type === "target") {
        // Click sutil tipo mira
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "square"; o.frequency.value = 1400;
        g.gain.setValueAtTime(0.04, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(now); o.stop(now + 0.04);
    }
}

document.addEventListener("click", initAudio, { once: true });

// ============================================================
//  FONDO
// ============================================================
const bgImage = new Image();
bgImage.src = "background.jpg";
let bgLoaded = false;
bgImage.onload = () => { bgLoaded = true; };
bgImage.onerror = () => console.error("❌ background.jpg no encontrado");

// ============================================================
//  ESTADO GLOBAL
// ============================================================
let eliminadas = 0;
let speedMultiplier = 1.0;
const TOTAL_OMENS = 25;
let globalTime = 0;

let shakeIntensity = 0;
let redFlash = 0;
let lightningTimer = 0;
let lightningFlash = 0;

let comboCount = 0;
let comboTimer = 0;
const COMBO_TIMEOUT = 90;
let currentLevel = "INICIAL";

// Power-ups
let timeScale = 1.0;
let slowMotionTimer = 0;
const SLOW_DURATION = 300;

let scoreMultiplier = 1;
let multiplierTimer = 0;
const MULT_DURATION = 600;

let killsUntilPowerUp = 6;

// MIRA
let mouseX = window_width / 2;
let mouseY = window_height / 2;
let mouseOverTarget = false;
let reticleRotation = 0;
let reticlePulse = 0;
let reticleWasOnTarget = false;

// Paletas
const omenPalette = [
    { main: "#c1121f", light: "#ff2a2a" },
    { main: "#a50f1a", light: "#e63946" },
    { main: "#d00000", light: "#ff4d4d" },
    { main: "#8b0000", light: "#dc2f02" },
    { main: "#b30000", light: "#ff1e1e" }
];
const goldenPalette = { main: "#b8860b", light: "#ffd700" };

// ============================================================
//  PARTÍCULAS
// ============================================================
class TrailParticle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2 - 0.3;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
        this.size = Math.random() * 3 + 1.5;
    }
    update() {
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
        this.vx *= 0.98; this.vy *= 0.98;
        this.life -= this.decay;
        this.size *= 0.985;
    }
    draw(c) {
        c.globalAlpha = this.life * 0.8;
        c.shadowColor = this.color; c.shadowBlur = 12;
        c.beginPath();
        c.arc(this.x, this.y, Math.max(0.3, this.size), 0, Math.PI * 2);
        c.fillStyle = this.color; c.fill();
        c.shadowBlur = 0; c.globalAlpha = 1;
    }
}

class ExplosionParticle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 6 + 2;
        this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.02;
        this.size = Math.random() * 4 + 2;
    }
    update() {
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
        this.vx *= 0.94; this.vy *= 0.94;
        this.vy += 0.15 * timeScale;
        this.life -= this.decay;
        this.size *= 0.97;
    }
    draw(c) {
        c.globalAlpha = this.life;
        c.shadowColor = this.color; c.shadowBlur = 20;
        c.beginPath();
        c.arc(this.x, this.y, Math.max(0.5, this.size * this.life), 0, Math.PI * 2);
        c.fillStyle = this.color; c.fill();
        c.shadowBlur = 0; c.globalAlpha = 1;
    }
}

class FragmentParticle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 8 + 3;
        this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
        this.life = 1.0;
        this.decay = Math.random() * 0.015 + 0.015;
        this.size = Math.random() * 6 + 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.3;
    }
    update() {
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
        this.vx *= 0.95; this.vy *= 0.95;
        this.vy += 0.35 * timeScale;
        this.rotation += this.rotSpeed * timeScale;
        this.life -= this.decay;
    }
    draw(c) {
        c.save();
        c.globalAlpha = this.life;
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        c.shadowColor = this.color; c.shadowBlur = 15;
        c.fillStyle = this.color;
        c.beginPath();
        c.moveTo(-this.size * 0.5, -this.size * 0.3);
        c.lineTo(this.size * 0.4, -this.size * 0.5);
        c.lineTo(this.size * 0.3, this.size * 0.5);
        c.closePath();
        c.fill();
        c.restore();
    }
}

class ShockwaveParticle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.radius = 5;
        this.maxRadius = 80;
        this.life = 1.0;
        this.decay = 0.05;
    }
    update() {
        this.radius += (this.maxRadius - this.radius) * 0.15 * timeScale;
        this.life -= this.decay;
    }
    draw(c) {
        c.save();
        c.globalAlpha = this.life * 0.9;
        c.shadowColor = this.color; c.shadowBlur = 25;
        c.strokeStyle = this.color;
        c.lineWidth = 4 * this.life;
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.stroke();
        c.restore();
    }
}

class EmberParticle {
    constructor() {
        this.x = Math.random() * window_width;
        this.y = window_height + Math.random() * 100;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -Math.random() * 0.8 - 0.3;
        this.life = 1.0;
        this.decay = Math.random() * 0.004 + 0.002;
        this.size = Math.random() * 2 + 0.8;
        const colors = ["#ff2a2a", "#ff4d4d", "#ff8c00", "#ffb300"];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    update() {
        this.x += (this.vx + Math.sin(this.y * 0.01) * 0.3) * timeScale;
        this.y += this.vy * timeScale;
        this.life -= this.decay;
        if (this.y < -10 || this.life <= 0) {
            this.x = Math.random() * window_width;
            this.y = window_height + Math.random() * 100;
            this.life = 1.0;
        }
    }
    draw(c) {
        c.globalAlpha = this.life * 0.7;
        c.shadowColor = this.color; c.shadowBlur = 8;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color; c.fill();
        c.shadowBlur = 0; c.globalAlpha = 1;
    }
}

class ScorePopup {
    constructor(x, y, text, color) {
        this.x = x; this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.02;
        this.vy = -2.5;
    }
    update() {
        this.y += this.vy * timeScale;
        this.vy *= 0.97;
        this.life -= this.decay;
    }
    draw(c) {
        c.save();
        c.globalAlpha = this.life;
        c.shadowColor = this.color; c.shadowBlur = 15;
        c.fillStyle = this.color;
        c.font = "bold 28px 'Segoe UI', Arial";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(this.text, this.x, this.y);
        c.restore();
    }
}

class GoldenSparkleParticle {
    constructor(omen) {
        this.omen = omen;
        this.angle = Math.random() * Math.PI * 2;
        this.radius = omen.size * (1.2 + Math.random() * 0.8);
        this.speed = 0.05 + Math.random() * 0.05;
        this.life = 1.0;
        this.decay = 0.02;
        this.size = Math.random() * 2 + 1.5;
    }
    update() {
        this.angle += this.speed * timeScale;
        this.life -= this.decay;
    }
    draw(c) {
        if (!this.omen || !this.omen._alive) return;
        const px = this.omen.x + Math.cos(this.angle) * this.radius;
        const py = this.omen.y + Math.sin(this.angle) * this.radius;
        c.globalAlpha = this.life;
        c.shadowColor = "#ffd700"; c.shadowBlur = 15;
        c.fillStyle = "#ffed4e";
        c.beginPath();
        c.arc(px, py, this.size, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0; c.globalAlpha = 1;
    }
}

let trailParticles = [];
let explosionParticles = [];
let fragmentParticles = [];
let shockwaveParticles = [];
let emberParticles = [];
let scorePopups = [];
let goldenSparks = [];
let powerUps = [];

function initEmbers(count) {
    for (let i = 0; i < count; i++) emberParticles.push(new EmberParticle());
}

// ============================================================
//  CLASE OMEN
// ============================================================
class Omen {
    constructor(x, y, size, speedMultiplier, isGolden = false) {
        this.x = x; this.y = y; this.size = size;
        this.isGolden = isGolden;
        this._alive = true;

        if (isGolden) {
            this.mainColor = goldenPalette.main;
            this.lightColor = goldenPalette.light;
            this.size = size * 1.15;
        } else {
            const pal = omenPalette[Math.floor(Math.random() * omenPalette.length)];
            this.mainColor = pal.main;
            this.lightColor = pal.light;
        }

        this.vy = Math.random() * 1.5 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.gravity = 0.18 * speedMultiplier;
        this.restitution = 0.72;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02 * (isGolden ? 3 : 1);
        this.radius = size * 1.05;
        this.trailTimer = 0;
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        const s = this.size;
        const pulse = 1 + Math.sin(globalTime * 0.05 + this.x * 0.01) * 0.15;

        context.shadowColor = this.lightColor;
        context.shadowBlur = (this.isGolden ? 40 : 25) * pulse;

        const teeth = 12;
        const outerR = s, innerR = s * 0.78;
        context.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
            const angle = (Math.PI / teeth) * i;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
            if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
        }
        context.closePath();
        context.fillStyle = this.mainColor; context.fill();
        context.strokeStyle = this.lightColor;
        context.lineWidth = this.isGolden ? 3 : 2;
        context.stroke();

        context.beginPath();
        context.arc(0, 0, s * 0.78, 0, Math.PI * 2);
        context.fillStyle = "#0d0000"; context.fill();

        context.shadowBlur = 0;
        context.beginPath();
        context.ellipse(0, -s * 0.08, s * 0.48, s * 0.52, 0, 0, Math.PI * 2);
        context.fillStyle = this.lightColor; context.fill();

        context.beginPath();
        context.ellipse(0, s * 0.35, s * 0.32, s * 0.18, 0, 0, Math.PI * 2);
        context.fillStyle = this.lightColor; context.fill();

        context.beginPath();
        context.ellipse(-s * 0.2, -s * 0.1, s * 0.14, s * 0.16, 0.15, 0, Math.PI * 2);
        context.fillStyle = "#0d0000"; context.fill();
        context.beginPath();
        context.ellipse(s * 0.2, -s * 0.1, s * 0.14, s * 0.16, -0.15, 0, Math.PI * 2);
        context.fillStyle = "#0d0000"; context.fill();

        context.beginPath();
        context.moveTo(0, s * 0.1);
        context.lineTo(-s * 0.06, s * 0.22);
        context.lineTo(s * 0.06, s * 0.22);
        context.closePath();
        context.fillStyle = "#0d0000"; context.fill();

        context.strokeStyle = "#0d0000"; context.lineWidth = 1.8;
        for (let i = -2; i <= 2; i++) {
            context.beginPath();
            context.moveTo(i * s * 0.09, s * 0.28);
            context.lineTo(i * s * 0.09, s * 0.44);
            context.stroke();
        }
        context.beginPath();
        context.moveTo(-s * 0.28, s * 0.36);
        context.lineTo(s * 0.28, s * 0.36);
        context.stroke();

        context.restore();
    }

    emitTrailParticles() {
        this.trailTimer++;
        if (this.trailTimer % (this.isGolden ? 1 : 2) === 0) {
            const ox = (Math.random() - 0.5) * this.size;
            const oy = (Math.random() - 0.5) * this.size;
            trailParticles.push(new TrailParticle(this.x + ox, this.y + oy, this.lightColor));
        }
        if (this.isGolden && this.trailTimer % 4 === 0) {
            goldenSparks.push(new GoldenSparkleParticle(this));
        }
    }

    update(context) {
        this.vy += this.gravity * timeScale;
        this.y += this.vy * timeScale;
        this.x += this.vx * timeScale;
        this.rotation += this.rotSpeed * timeScale;
        this.emitTrailParticles();

        if (this.y + this.size > window_height) {
            this.y = window_height - this.size;
            this.vy = -this.vy * this.restitution;

            for (let i = 0; i < 5; i++) {
                explosionParticles.push(new ExplosionParticle(
                    this.x, this.y + this.size * 0.5, this.lightColor
                ));
            }
            playSound("bounce");

            if (Math.abs(this.vy) < 1.2) this.respawn();
        }

        if (this.x - this.size < 0) {
            this.x = this.size; this.vx = Math.abs(this.vx);
        } else if (this.x + this.size > window_width) {
            this.x = window_width - this.size; this.vx = -Math.abs(this.vx);
        }

        this.draw(context);
    }

    respawn() {
        this.x = Math.random() * (window_width - this.size * 2) + this.size;
        this.y = -this.size - Math.random() * 50;
        this.vy = Math.random() * 1.5 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.gravity = 0.18 * speedMultiplier;

        this.isGolden = Math.random() < 0.20;
        if (this.isGolden) {
            this.mainColor = goldenPalette.main;
            this.lightColor = goldenPalette.light;
        } else {
            const pal = omenPalette[Math.floor(Math.random() * omenPalette.length)];
            this.mainColor = pal.main; this.lightColor = pal.light;
        }

        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02 * (this.isGolden ? 3 : 1);
    }

    contains(mx, my) {
        const dx = mx - this.x, dy = my - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    }
}

// ============================================================
//  POWER-UPS
// ============================================================
class PowerUp {
    constructor(type) {
        this.type = type;
        this.x = Math.random() * (window_width - 100) + 50;
        this.y = -50;
        this.vy = 1.2;
        this.radius = 25;
        this.rotation = 0;
        this.rotSpeed = 0.03;
        this.life = 1.0;
        this._alive = true;
    }
    update() {
        this.y += this.vy * timeScale;
        this.rotation += this.rotSpeed * timeScale;
        if (this.y > window_height + 60) this._alive = false;
    }
    contains(mx, my) {
        const dx = mx - this.x, dy = my - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius * 1.4;
    }
    draw(c) {
        const isSlow = this.type === "slow";
        const color = isSlow ? "#48dbfb" : "#ffb300";
        const colorLight = isSlow ? "#00d2ff" : "#ffd700";

        c.save();
        c.translate(this.x, this.y);

        const pulse = 1 + Math.sin(globalTime * 0.15) * 0.15;
        c.shadowColor = color; c.shadowBlur = 30 * pulse;

        c.beginPath();
        c.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
        c.fillStyle = "rgba(0,0,0,0.75)";
        c.fill();
        c.strokeStyle = color;
        c.lineWidth = 3;
        c.stroke();

        c.rotate(this.rotation);

        c.shadowBlur = 15;
        c.fillStyle = colorLight;
        c.font = "bold 26px 'Segoe UI', Arial";
        c.textAlign = "center";
        c.textBaseline = "middle";

        if (isSlow) {
            c.beginPath();
            c.arc(0, 0, 11, 0, Math.PI * 2);
            c.strokeStyle = colorLight; c.lineWidth = 2.5;
            c.stroke();
            c.beginPath();
            c.moveTo(0, 0); c.lineTo(0, -6);
            c.moveTo(0, 0); c.lineTo(5, 0);
            c.stroke();
        } else {
            c.fillText("×2", 0, 0);
        }

        c.restore();
    }
}

function spawnPowerUp() {
    const type = Math.random() < 0.5 ? "slow" : "multiplier";
    powerUps.push(new PowerUp(type));
}

// ============================================================
//  GENERAR OMENS
// ============================================================
let omens = [];

function generateOmens(n) {
    for (let i = 0; i < n; i++) {
        const size = Math.random() * 12 + 18;
        const x = Math.random() * (window_width - size * 2) + size;
        const y = -size - Math.random() * 300;
        const isGolden = Math.random() < 0.15;
        omens.push(new Omen(x, y, size, speedMultiplier, isGolden));
    }
}

// ============================================================
//  REGLAS DE VELOCIDAD
// ============================================================
function updateSpeedMultiplier() {
    let newLevel = currentLevel;
    if (eliminadas > 20) { speedMultiplier = 2.2; newLevel = "ALTA"; }
    else if (eliminadas > 10) { speedMultiplier = 1.5; newLevel = "MEDIA"; }
    else { speedMultiplier = 1.0; newLevel = "INICIAL"; }

    omens.forEach(o => o.gravity = 0.18 * speedMultiplier);

    if (newLevel !== currentLevel) {
        currentLevel = newLevel;
        showLevelNotification(newLevel);
        playSound("levelup");
    }
}

function showLevelNotification(level) {
    nivelHTML.textContent = `VELOCIDAD ${level}`;
    nivelHTML.classList.add("show");
    setTimeout(() => nivelHTML.classList.remove("show"), 1200);
}

// ============================================================
//  ACTIVAR POWER-UPS
// ============================================================
function activatePowerUp(type, x, y) {
    playSound("powerup");

    if (type === "slow") {
        timeScale = 0.35;
        slowMotionTimer = SLOW_DURATION;
        for (let i = 0; i < 30; i++) {
            explosionParticles.push(new ExplosionParticle(x, y, "#48dbfb"));
        }
        shockwaveParticles.push(new ShockwaveParticle(x, y, "#48dbfb"));
    } else if (type === "multiplier") {
        scoreMultiplier = 2;
        multiplierTimer = MULT_DURATION;
        for (let i = 0; i < 30; i++) {
            explosionParticles.push(new ExplosionParticle(x, y, "#ffd700"));
        }
        shockwaveParticles.push(new ShockwaveParticle(x, y, "#ffd700"));
    }

    const label = type === "slow" ? "¡RALENTÍ!" : "¡PUNTOS x2!";
    const color = type === "slow" ? "#48dbfb" : "#ffd700";
    scorePopups.push(new ScorePopup(x, y, label, color));
}

// ============================================================
//  HUD DE POWER-UPS
// ============================================================
function updatePowerUpHUD() {
    let html = "";

    if (slowMotionTimer > 0) {
        const pct = (slowMotionTimer / SLOW_DURATION) * 100;
        html += `
            <div class="powerup-bar slow active">
                <span>⏱️ RALENTÍ</span>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
            </div>`;
    }

    if (multiplierTimer > 0) {
        const pct = (multiplierTimer / MULT_DURATION) * 100;
        html += `
            <div class="powerup-bar multiplier active">
                <span>×2 PUNTOS</span>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
            </div>`;
    }

    powerupHUD.innerHTML = html;
}

// ============================================================
//  CLIC
// ============================================================
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (powerUps[i].contains(clickX, clickY)) {
            activatePowerUp(powerUps[i].type, powerUps[i].x, powerUps[i].y);
            powerUps.splice(i, 1);
            return;
        }
    }

    for (let i = omens.length - 1; i >= 0; i--) {
        if (omens[i].contains(clickX, clickY)) {
            const o = omens[i];
            const isGolden = o.isGolden;

            const particleCount = isGolden ? 35 : 20;
            for (let p = 0; p < particleCount; p++) {
                explosionParticles.push(new ExplosionParticle(
                    o.x, o.y, p % 2 === 0 ? o.lightColor : (isGolden ? "#ffed4e" : "#ffb300")
                ));
            }
            for (let p = 0; p < (isGolden ? 18 : 10); p++) {
                fragmentParticles.push(new FragmentParticle(o.x, o.y, o.lightColor));
            }
            shockwaveParticles.push(new ShockwaveParticle(o.x, o.y, o.lightColor));

            const basePoints = isGolden ? 5 : 1;
            const comboBonus = comboCount > 0 ? comboCount + 1 : 1;
            const finalPoints = (basePoints * comboBonus) * scoreMultiplier;

            scorePopups.push(new ScorePopup(
                o.x, o.y,
                `+${finalPoints}${isGolden ? " ⭐" : ""}`,
                isGolden ? "#ffd700" : "#ffb300"
            ));

            shakeIntensity = Math.min(20, (isGolden ? 10 : 6) + comboCount * 2);
            redFlash = isGolden ? 0.5 : 0.35;

            comboCount++;
            comboTimer = COMBO_TIMEOUT;
            if (comboCount > 1) {
                comboHTML.textContent = `COMBO x${comboCount}`;
                comboHTML.classList.add("active");
            }

            eliminadas += finalPoints;
            contadorHTML.textContent = `Eliminadas: ${eliminadas}`;
            contadorHTML.classList.add("pulse");
            setTimeout(() => contadorHTML.classList.remove("pulse"), 150);

            playSound(isGolden ? "golden" : "kill");

            killsUntilPowerUp--;
            if (killsUntilPowerUp <= 0) {
                spawnPowerUp();
                killsUntilPowerUp = 6 + Math.floor(Math.random() * 4);
            }

            o._alive = false;

            omens.splice(i, 1);
            const size = Math.random() * 12 + 18;
            const x = Math.random() * (window_width - size * 2) + size;
            const y = -size - Math.random() * 50;
            omens.push(new Omen(x, y, size, speedMultiplier, false));

            updateSpeedMultiplier();
            break;
        }
    }
});

// ============================================================
//  MOUSEMOVE
// ============================================================
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const hoverOmen = omens.some(o => o.contains(mouseX, mouseY));
    const hoverPower = powerUps.some(p => p.contains(mouseX, mouseY));
    mouseOverTarget = hoverOmen || hoverPower;

    // Sonido al entrar en un objetivo (solo una vez)
    if (mouseOverTarget && !reticleWasOnTarget) {
        playSound("target");
    }
    reticleWasOnTarget = mouseOverTarget;
});

// ============================================================
//  FONDO + EFECTOS DE ESCENA
// ============================================================
function drawBackground() {
    if (bgLoaded) {
        const imgRatio = bgImage.width / bgImage.height;
        const canvasRatio = window_width / window_height;
        let dw, dh, ox, oy;
        if (canvasRatio > imgRatio) {
            dw = window_width; dh = window_width / imgRatio;
            ox = 0; oy = (window_height - dh) / 2;
        } else {
            dh = window_height; dw = window_height * imgRatio;
            ox = (window_width - dw) / 2; oy = 0;
        }
        ctx.drawImage(bgImage, ox, oy, dw, dh);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(0, 0, window_width, window_height);
    } else {
        ctx.fillStyle = "#0d0000";
        ctx.fillRect(0, 0, window_width, window_height);
    }
}

function drawLightning() {
    lightningTimer++;
    if (lightningTimer > 120 && Math.random() < 0.02) {
        lightningFlash = 1.0;
        lightningTimer = 0;
    }
    if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(255, 200, 200, ${lightningFlash * 0.25})`;
        ctx.fillRect(0, 0, window_width, window_height);
        lightningFlash -= 0.08;
        if (lightningFlash < 0) lightningFlash = 0;
    }
}

function drawVignette() {
    const grad = ctx.createRadialGradient(
        window_width / 2, window_height / 2, Math.min(window_width, window_height) * 0.3,
        window_width / 2, window_height / 2, Math.max(window_width, window_height) * 0.75
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, window_width, window_height);
}

function drawDangerZone() {
    const grad = ctx.createLinearGradient(0, window_height - 80, 0, window_height);
    grad.addColorStop(0, "rgba(255, 0, 0, 0)");
    grad.addColorStop(1, "rgba(255, 0, 0, 0.3)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, window_height - 80, window_width, 80);
}

function drawRedFlash() {
    if (redFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${redFlash})`;
        ctx.fillRect(0, 0, window_width, window_height);
        redFlash -= 0.05;
        if (redFlash < 0) redFlash = 0;
    }
}

function drawSlowMotionOverlay() {
    if (slowMotionTimer > 0) {
        const alpha = 0.15 * (slowMotionTimer / SLOW_DURATION);
        ctx.fillStyle = `rgba(72, 219, 251, ${alpha})`;
        ctx.fillRect(0, 0, window_width, window_height);

        ctx.save();
        ctx.strokeStyle = `rgba(72, 219, 251, ${alpha * 2})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const y = (globalTime * 2 + i * 100) % window_height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(window_width, y);
            ctx.stroke();
        }
        ctx.restore();
    }
}

// ============================================================
//  🔫 MIRA TIPO GNASHER
// ============================================================
function drawReticle() {
    const x = mouseX;
    const y = mouseY;

    const mainColor = mouseOverTarget ? "#ff2a2a" : "#ffb300";
    const glowColor = mouseOverTarget ? "#ff0000" : "#ffd700";

    ctx.save();
    ctx.translate(x, y);

    reticleRotation += 0.02;

    // Pulso
    if (mouseOverTarget) {
        reticlePulse = Math.min(1, reticlePulse + 0.1);
    } else {
        reticlePulse = Math.max(0, reticlePulse - 0.05);
    }

    // Glow general
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = mouseOverTarget ? 25 : 15;

    // ── Aro exterior ──
    const outerR = 26;
    const tickLen = 6;

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.stroke();

    // 4 marcas grandes
    const bigTicks = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    ctx.lineWidth = 3;
    bigTicks.forEach(angle => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(cos * (outerR + 2), sin * (outerR + 2));
        ctx.lineTo(cos * (outerR + 2 + tickLen), sin * (outerR + 2 + tickLen));
        ctx.stroke();
    });

    // 4 marcas pequeñas
    const smallTicks = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    ctx.lineWidth = 1.5;
    smallTicks.forEach(angle => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(cos * (outerR + 3), sin * (outerR + 3));
        ctx.lineTo(cos * (outerR + 3 + tickLen * 0.6), sin * (outerR + 3 + tickLen * 0.6));
        ctx.stroke();
    });

    // ── Aro interior giratorio (3 segmentos) ──
    ctx.save();
    ctx.rotate(reticleRotation);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.85;
    const innerR = 15;
    const segments = 3;
    for (let i = 0; i < segments; i++) {
        const start = (Math.PI * 2 / segments) * i + 0.25;
        const end = (Math.PI * 2 / segments) * (i + 1) - 0.25;
        ctx.beginPath();
        ctx.arc(0, 0, innerR, start, end);
        ctx.stroke();
    }
    ctx.restore();

    // ── Aro muy interno ──
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Punto central ──
    ctx.shadowBlur = mouseOverTarget ? 20 : 10;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = mouseOverTarget ? "#ff0000" : "#ffd700";
    ctx.fill();

    // ── Líneas cardinales ──
    ctx.shadowBlur = 0;
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(-outerR - 10, 0); ctx.lineTo(-outerR - 4, 0);
    ctx.moveTo(outerR + 4, 0);  ctx.lineTo(outerR + 10, 0);
    ctx.moveTo(0, -outerR - 10); ctx.lineTo(0, -outerR - 4);
    ctx.moveTo(0, outerR + 4);  ctx.lineTo(0, outerR + 10);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Aro de impacto pulsante al apuntar ──
    if (mouseOverTarget) {
        const pulse = 1 + Math.sin(globalTime * 0.3) * 0.2;
        ctx.strokeStyle = "#ff2a2a";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, (32 + reticlePulse * 6) * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

// ============================================================
//  ANIMACIÓN
// ============================================================
function animate() {
    globalTime++;

    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) {
            comboCount = 0;
            comboHTML.classList.remove("active");
        }
    }
    if (slowMotionTimer > 0) {
        slowMotionTimer--;
        if (slowMotionTimer === 0) timeScale = 1.0;
    }
    if (multiplierTimer > 0) {
        multiplierTimer--;
        if (multiplierTimer === 0) scoreMultiplier = 1;
    }
    updatePowerUpHUD();

    ctx.save();
    if (shakeIntensity > 0.1) {
        const sx = (Math.random() - 0.5) * shakeIntensity;
        const sy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(sx, sy);
        shakeIntensity *= 0.88;
    }

    drawBackground();
    drawLightning();
    drawDangerZone();

    emberParticles.forEach(p => { p.update(); p.draw(ctx); });

    for (let i = trailParticles.length - 1; i >= 0; i--) {
        const p = trailParticles[i]; p.update(); p.draw(ctx);
        if (p.life <= 0.05) trailParticles.splice(i, 1);
    }

    for (let i = goldenSparks.length - 1; i >= 0; i--) {
        const p = goldenSparks[i]; p.update(); p.draw(ctx);
        if (p.life <= 0.05) goldenSparks.splice(i, 1);
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i]; pu.update();
        if (!pu._alive) { powerUps.splice(i, 1); continue; }
        pu.draw(ctx);
    }

    omens.forEach(o => o.update(ctx));

    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i]; p.update(); p.draw(ctx);
        if (p.life <= 0.05) explosionParticles.splice(i, 1);
    }
    for (let i = fragmentParticles.length - 1; i >= 0; i--) {
        const p = fragmentParticles[i]; p.update(); p.draw(ctx);
        if (p.life <= 0.05) fragmentParticles.splice(i, 1);
    }
    for (let i = shockwaveParticles.length - 1; i >= 0; i--) {
        const p = shockwaveParticles[i]; p.update(); p.draw(ctx);
        if (p.life <= 0.05) shockwaveParticles.splice(i, 1);
    }
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i]; p.update(); p.draw(ctx);
        if (p.life <= 0.05) scorePopups.splice(i, 1);
    }

    drawSlowMotionOverlay();
    drawVignette();
    drawRedFlash();

    // 🔫 Mira al final (encima de todo)
    drawReticle();

    ctx.restore();
    requestAnimationFrame(animate);
}

// ============================================================
//  RESIZE
// ============================================================
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// ============================================================
//  INICIO
// ============================================================
initEmbers(60);
generateOmens(TOTAL_OMENS);
contadorHTML.textContent = `Eliminadas: 0`;
animate();