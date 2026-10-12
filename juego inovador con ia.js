
"use strict";

// ======================================
// NEON SHIFT — Juego arcade
// ======================================

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    const boton = document.getElementById("startButton");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");
    const scoreElement = document.getElementById("score");
    const bestElement = document.getElementById("best");
    const gravityElement = document.getElementById("gravity");

    if (!canvas || !boton || !overlay) {
        console.error("NEON SHIFT: faltan elementos del HTML.");
        return;
    }

    const W = canvas.width;
    const H = canvas.height;

    let running = false;
    let gameOver = false;
    let score = 0;
    let best = 0;
    let gravity = 1;
    let lastTime = 0;
    let spawnTimer = 0;
    let crystalTimer = 0;
    let speed = 5;
    let animationId = null;   
    let countdown = 0;
    let countdownTimer = 0;
    let readyToPlay = false;


    try {
        best = Number(localStorage.getItem("neonShiftBest")) || 0;
    } catch (error) {
        best = 0;
    }

    bestElement.textContent = best;

    const player = {
        x: 110,
        y: 200,
        w: 28,
        h: 28,
        vy: 0,
        jump: 9
    };

    let obstacles = [];
    let crystals = [];
    let particles = [];

    // Fondo con estrellas
    const stars = Array.from({ length: 65 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.2
    }));

    function updateHUD() {
        scoreElement.textContent = score;
        bestElement.textContent = best;

        gravityElement.textContent =
            gravity === 1 ? "GRAVEDAD ↓" : "GRAVEDAD ↑";
    }

function startGame() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    running = true;
    gameOver = false;
    readyToPlay = false;

    score = 0;
    gravity = 1;
    speed = 5;

    spawnTimer = 0;
    crystalTimer = 0;
    lastTime = 0;

    countdown = 3;
    countdownTimer = 0;

    // La bola empieza en el centro
    player.x = W / 2 - player.w / 2;
    player.y = H / 2 - player.h / 2;
    player.vy = 0;

    obstacles = [];
    crystals = [];
    particles = [];

    overlay.style.display = "none";

    updateHUD();
    draw();

    animationId = requestAnimationFrame(gameLoop);
}

    function changeGravity() {
        if (!running || gameOver) return;

        gravity *= -1;
        player.vy = 0;

        gravityElement.textContent =
            gravity === 1 ? "GRAVEDAD ↓" : "GRAVEDAD ↑";

        createParticles(
            player.x + player.w / 2,
            player.y + player.h / 2,
            "#00f5ff",
            8
        );
    }

    function spawnObstacle() {
        const fromTop = Math.random() < 0.5;
        const height = 35 + Math.random() * 65;

        obstacles.push({
            x: W + 20,
            y: fromTop ? 0 : H - height,
            w: 22 + Math.random() * 18,
            h: height,
            color: fromTop ? "#ff3cac" : "#8b5cf6"
        });
    }

    function spawnCrystal() {
        crystals.push({
            x: W + 20,
            y: 60 + Math.random() * (H - 120),
            r: 9,
            collected: false,
            angle: 0
        });
    }

    function createParticles(x, y, color, amount) {
        for (let i = 0; i < amount; i++) {
            particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 25 + Math.random() * 15,
                color
            });
        }
    }

    function overlaps(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    function endGame() {
        running = false;
        gameOver = true;

        if (score > best) {
            best = score;
            bestElement.textContent = best;

            try {
                localStorage.setItem("neonShiftBest", best);
            } catch (error) {
                console.warn("No se pudo guardar el récord.");
            }
        }

        overlayTitle.innerHTML = "FIN DEL<br>JUEGO.";
        overlayText.textContent =
            `Puntuación: ${score}. ¿Puedes superar tu récord?`;

        boton.textContent = "VOLVER A JUGAR ↗";
        overlay.style.display = "flex";

        updateHUD();
    }

    function update(dt) {
      
    // Cuenta regresiva antes de jugar
    if (!readyToPlay) {
        countdownTimer += dt;

        if (countdownTimer >= 60) {
            countdown--;
            countdownTimer = 0;
        }

        if (countdown <= 0) {
            readyToPlay = true;
            player.y = H / 2 - player.h / 2;
            player.vy = 0;
        }

        return;
    }

        // Movimiento del jugador
        player.vy += gravity * 0.42 * dt;
        player.y += player.vy * dt;

        // Límites del escenario
        if (player.y < 0 || player.y + player.h > H) {
            endGame();
            return;
        }

        // La dificultad aumenta gradualmente
        speed = 5 + Math.min(score / 100, 5);

        spawnTimer += dt;
        crystalTimer += dt;

        if (spawnTimer > Math.max(42, 85 - score / 8)) {
            spawnObstacle();
            spawnTimer = 0;
        }

        if (crystalTimer > 75) {
            spawnCrystal();
            crystalTimer = 0;
        }

        // Mover obstáculos y detectar colisiones
        for (const obstacle of obstacles) {
            obstacle.x -= speed * dt;

            if (overlaps(player, obstacle)) {
                endGame();
                return;
            }
        }

        obstacles = obstacles.filter(o => o.x + o.w > 0);

        // Mover y recoger cristales
        for (const crystal of crystals) {
            crystal.x -= speed * dt;
            crystal.angle += 0.06 * dt;

            const dx =
                player.x + player.w / 2 - crystal.x;
            const dy =
                player.y + player.h / 2 - crystal.y;

            if (
                !crystal.collected &&
                Math.hypot(dx, dy) < crystal.r + 18
            ) {
                crystal.collected = true;
                score += 10;

                createParticles(
                    crystal.x,
                    crystal.y,
                    "#ffe66d",
                    12
                );

                updateHUD();
            }
        }

        crystals = crystals.filter(
            c => c.x + c.r > 0 && !c.collected
        );

        // Puntos por sobrevivir
        score += Math.floor(dt * 0.08);
        updateHUD();

        // Animar partículas
        for (const p of particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }

        particles = particles.filter(p => p.life > 0);
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, "#080b20");
        gradient.addColorStop(1, "#15102f");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        // Estrellas
        for (const star of stars) {
            ctx.globalAlpha = star.alpha;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        ctx.globalAlpha = 1;

        // Líneas de referencia
        ctx.strokeStyle = "rgba(0, 245, 255, 0.12)";
        ctx.lineWidth = 1;

        for (let x = 0; x < W; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }

        for (let y = 0; y < H; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Bordes de gravedad
        ctx.fillStyle = "rgba(0, 245, 255, 0.12)";
        ctx.fillRect(0, gravity === 1 ? H - 5 : 0, W, 5);
        ctx.fillRect(0, gravity === 1 ? 0 : H - 5, W, 2);
    }

    function drawPlayer() {
        ctx.save();

        ctx.shadowBlur = 22;
        ctx.shadowColor = "#00f5ff";
        ctx.fillStyle = "#00f5ff";

        ctx.fillRect(
            player.x,
            player.y,
            player.w,
            player.h
        );

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";

        ctx.fillRect(
            player.x + 7,
            player.y + 7,
            6,
            6
        );

        ctx.restore();
    }

    function drawObstacles() {
        for (const obstacle of obstacles) {
            ctx.save();

            ctx.shadowBlur = 16;
            ctx.shadowColor = obstacle.color;
            ctx.fillStyle = obstacle.color;

            ctx.fillRect(
                obstacle.x,
                obstacle.y,
                obstacle.w,
                obstacle.h
            );

            ctx.restore();
        }
    }

    function drawCrystals() {
        for (const crystal of crystals) {
            ctx.save();

            ctx.translate(crystal.x, crystal.y);
            ctx.rotate(crystal.angle);
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ffe66d";
            ctx.fillStyle = "#ffe66d";

            ctx.beginPath();
            ctx.moveTo(0, -crystal.r);
            ctx.lineTo(crystal.r, 0);
            ctx.lineTo(0, crystal.r);
            ctx.lineTo(-crystal.r, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life / 40);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        }

        ctx.globalAlpha = 1;
    }

    function draw() {
        drawBackground();
        drawCrystals();
        drawObstacles();
        drawPlayer();
        drawParticles();
        if (running && !readyToPlay) {
    ctx.save();

    ctx.fillStyle = "rgba(5, 8, 25, 0.45)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowBlur = 30;
    ctx.shadowColor = "#00f5ff";
    ctx.fillStyle = "#00f5ff";
    ctx.font = "bold 100px Arial";

    ctx.fillText(
        countdown > 0 ? countdown : "¡YA!",
        W / 2,
        H / 2
    );

    ctx.restore();
}
    }

    function gameLoop(timestamp) {
        if (!running) {
            animationId = null;
            return;
        }

        if (lastTime === 0) lastTime = timestamp;

        // Evitar saltos si la pestaña estuvo inactiva
        const dt = Math.min((timestamp - lastTime) / 16.67, 2);
        lastTime = timestamp;

        update(dt);

        if (running) {
            draw();
            animationId = requestAnimationFrame(gameLoop);
        } else {
            animationId = null;
            draw();
        }
    }

    // Botón de inicio y reinicio
    boton.addEventListener("click", startGame);

    // Espacio para cambiar la gravedad
    document.addEventListener("keydown", event => {
        if (event.code === "Space") {
            event.preventDefault();

            if (running) {
                changeGravity();
            } else if (gameOver) {
                startGame();
            }
        }
    });

    // Clic sobre el escenario para cambiar la gravedad
    canvas.addEventListener("click", () => {
        if (running) changeGravity();
    });

    // Pantalla inicial
    overlayTitle.innerHTML = "CAMBIA<br>LAS REGLAS.";
    overlayText.textContent =
        "Cambia la gravedad, recoge cristales y sobrevive.";

    boton.textContent = "INICIAR JUEGO ↗";

    updateHUD();
    draw();

    console.log("NEON SHIFT está listo.");
});
