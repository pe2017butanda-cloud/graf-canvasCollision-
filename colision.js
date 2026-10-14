const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const window_height = window.innerHeight;
const window_width = window.innerWidth;

canvas.height = window_height;
canvas.width = window_width;

// ============================================================
//  FONDO DEGRADADO
// ============================================================
let gradient = null;

function createGradient() {
    gradient = ctx.createLinearGradient(0, 0, window_width, window_height);
    gradient.addColorStop(0,    "#0f2027");
    gradient.addColorStop(0.5,  "#203a43");
    gradient.addColorStop(1,    "#2c5364");
}

createGradient();

// Pintar el fondo completo una sola vez al inicio
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, window_width, window_height);

// ============================================================
//  CLASE CIRCLE (POO)
// ============================================================
class Circle {
    constructor(x, y, radius, color, text, speed) {
        this.posX = x;
        this.posY = y;
        this.radius = radius;
        this.color = color;
        this.originalColor = color;
        this.text = text;
        this.speed = speed;

        this.dx = (Math.random() < 0.5 ? -1 : 1) * this.speed;
        this.dy = (Math.random() < 0.5 ? -1 : 1) * this.speed;

        this.isColliding = false;    // Flash azul por choque con otro círculo
        this.flashTime = 0;
        this.wallFlashTime = 0;      // Flash blanco por choque con pared
    }

    draw(context) {
        const isBlue = this.isColliding || this.flashTime > 0;
        const isWall = this.wallFlashTime > 0;

        let currentColor = this.originalColor;
        if (isBlue) currentColor = "#00aaff";
        if (isWall) currentColor = "#ffffff";

        // -------- Núcleo luminoso (glow) --------
        context.save();
        context.beginPath();
        context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false);
        const grad = context.createRadialGradient(
            this.posX, this.posY, this.radius * 0.2,
            this.posX, this.posY, this.radius
        );
        grad.addColorStop(0, this.hexToRGBA(currentColor, isWall ? 0.55 : (isBlue ? 0.45 : 0.28)));
        grad.addColorStop(1, this.hexToRGBA(currentColor, 0));
        context.fillStyle = grad;
        context.fill();
        context.restore();

        // -------- Borde con shadow blur (efecto neón) --------
        context.save();
        context.shadowColor = currentColor;
        context.shadowBlur = isWall ? 45 : (isBlue ? 30 : 18);
        context.beginPath();
        context.strokeStyle = currentColor;
        context.lineWidth = isWall ? 4 : (isBlue ? 3 : 2);
        context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false);
        context.stroke();
        context.restore();

        // -------- Etiqueta --------
        context.beginPath();
        context.fillStyle = (isWall || isBlue) ? "#ffffff" : "rgba(255,255,255,0.9)";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "bold 14px 'Segoe UI', Arial";
        context.fillText(this.text, this.posX, this.posY);
        context.closePath();
    }

    hexToRGBA(hex, alpha) {
        if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex;
        let c = hex.replace("#", "");
        if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    update(context) {
        if (this.flashTime > 0)     this.flashTime--;
        if (this.wallFlashTime > 0) this.wallFlashTime--;

        this.draw(context);

        // --------- Movimiento X ---------
        this.posX += this.dx;
        if (this.posX + this.radius > window_width) {
            this.posX = window_width - this.radius;
            this.dx = -Math.abs(this.dx);
            this.wallFlashTime = 14;
        } else if (this.posX - this.radius < 0) {
            this.posX = this.radius;
            this.dx = Math.abs(this.dx);
            this.wallFlashTime = 14;
        }

        // --------- Movimiento Y ---------
        this.posY += this.dy;
        if (this.posY + this.radius > window_height) {
            this.posY = window_height - this.radius;
            this.dy = -Math.abs(this.dy);
            this.wallFlashTime = 14;
        } else if (this.posY - this.radius < 0) {
            this.posY = this.radius;
            this.dy = Math.abs(this.dy);
            this.wallFlashTime = 14;
        }
    }

    getDistance(other) {
        const dx = other.posX - this.posX;
        const dy = other.posY - this.posY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkCollision(other) {
        return this.getDistance(other) < this.radius + other.radius;
    }

    resolveCollision(other) {
        const dx = other.posX - this.posX;
        const dy = other.posY - this.posY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;

        const nx = dx / distance;
        const ny = dy / distance;

        const overlap = (this.radius + other.radius) - distance;
        if (overlap > 0) {
            this.posX -= nx * (overlap / 2);
            this.posY -= ny * (overlap / 2);
            other.posX += nx * (overlap / 2);
            other.posY += ny * (overlap / 2);
        }

        const tx = -ny;
        const ty = nx;

        const dpThisN  = this.dx * nx + this.dy * ny;
        const dpOtherN = other.dx * nx + other.dy * ny;
        const dpThisT  = this.dx * tx + this.dy * ty;
        const dpOtherT = other.dx * tx + other.dy * ty;

        this.dx = (dpOtherN * nx) + (dpThisT * tx);
        this.dy = (dpOtherN * ny) + (dpThisT * ty);
        other.dx = (dpThisN * nx) + (dpOtherT * tx);
        other.dy = (dpThisN * ny) + (dpOtherT * ty);

        this.clampToCanvas();
        other.clampToCanvas();

        this.isColliding = true;
        other.isColliding = true;
        this.flashTime = 12;
        other.flashTime = 12;
    }

    clampToCanvas() {
        if (this.posX - this.radius < 0) this.posX = this.radius;
        if (this.posX + this.radius > window_width) this.posX = window_width - this.radius;
        if (this.posY - this.radius < 0) this.posY = this.radius;
        if (this.posY + this.radius > window_height) this.posY = window_height - this.radius;
    }
}

// ============================================================
//  GENERACIÓN DE CÍRCULOS
// ============================================================
let circles = [];

const palette = [
    "#ff6b6b", // coral
    "#feca57", // amarillo
    "#48dbfb", // celeste
    "#1dd1a1", // verde agua
    "#ff9ff3", // rosa
    "#f368e0", // magenta
    "#54a0ff", // azul
    "#5f27cd", // violeta
    "#c8d6e5"  // gris claro
];

function generateCircles(n) {
    for (let i = 0; i < n; i++) {
        let radius = Math.random() * 25 + 20;
        let x = Math.random() * (window_width - radius * 2) + radius;
        let y = Math.random() * (window_height - radius * 2) + radius;
        let color = palette[Math.floor(Math.random() * palette.length)];
        let speed = Math.random() * 4 + 1;
        let text = (i + 1).toString();
        circles.push(new Circle(x, y, radius, color, text, speed));
    }
}

// ============================================================
//  COLISIONES
// ============================================================
function handleCollisions() {
    circles.forEach(c => c.isColliding = false);

    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            if (circles[i].checkCollision(circles[j])) {
                circles[i].resolveCollision(circles[j]);
            }
        }
    }
}

// ============================================================
//  ANIMACIÓN (con estelas)
// ============================================================
function animate() {
    // ✨ Pintar el degradado con baja opacidad -> deja estelas
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window_width, window_height);
    ctx.globalAlpha = 1;

    handleCollisions();
    circles.forEach(circle => circle.update(ctx));

    requestAnimationFrame(animate);
}

// Ajustar al redimensionar
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createGradient();
    // Rellenar fondo de nuevo
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window_width, window_height);
});

// ============================================================
//  INICIO
// ============================================================
generateCircles(20);
animate();