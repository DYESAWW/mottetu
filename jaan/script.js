const canvas = document.getElementById("simulaator");
const ctx = canvas.getContext("2d");

const balls = [];

const colors = [
    "#d55830", // Darwin
    "#f0e33f", // Spongebob
    "#d80026", // Angry bird
    "#b0c400", // Shrek
    "#4695d6", // Smurf
    "#712a95"  // Purple guy
];

let width = 0;
let height = 0;
let gravity = 0.35;
let dragPall = null;

// Canvas vastavalt akna suurusele
function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;

    const scale = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Uue palli loomine
function lisaPall(x, y) {
    const r = 15 + Math.random() * 20;

    balls.push({
        x: Math.max(r, Math.min(width - r, x)),
        y: Math.max(r, Math.min(height - r, y)),
        r: r,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)]
    });

    document.getElementById("arv").textContent = balls.length;
}

// Joonistame ringi
function drawBall(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
}

// Pallide liikumine ja fyysika
let lastTime = 0;

function update(time) {
    const dt = lastTime
        ? Math.min((time - lastTime) / 16.67, 2) //
        : 1;

    lastTime = time;
    ctx.clearRect(0, 0, width, height);

    for (const p of balls) {
        if (p !== dragPall) {
            const bounce = gravity === 0 ? 1 : 0.85;

            // Gravitatsioon
            p.vy += gravity * dt;

            // Uus asukoht
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // ohutakistus
            if (gravity !== 0) {
                p.vx *= Math.pow(0.998, dt);
            }
            
            // Vasak sein
            if (p.x - p.r < 0) {
                p.x = p.r;
                p.vx = Math.abs(p.vx) * bounce;
            }

            // Parem sein
            if (p.x + p.r > width) {
                p.x = width - p.r;
                p.vx = -Math.abs(p.vx) * bounce;
            }

            // Lagi
            if (p.y - p.r < 0) {
                p.y = p.r;
                p.vy = Math.abs(p.vy) * bounce;
            }

            // Porand
            if (p.y + p.r > height) {
                p.y = height - p.r;
                p.vy = -Math.abs(p.vy) * bounce;

                if (Math.abs(p.vy) < 0.7) {
                    p.vy = 0;
                }
            }
        }
    
        drawBall(p);
    }


    requestAnimationFrame(update);
}

// Hiire koordinaadid
function mousePos(e) {
    return { x: e.clientX, y: e.clientY };
}


// Klikkides lisame palli voi hakkame seda liigutama
canvas.addEventListener("pointerdown", (e) => {
    const mouse = mousePos(e);

    dragPall = [...balls].reverse().find(p =>
        Math.hypot(p.x - mouse.x, p.y - mouse.y) < p.r
    );

    if (dragPall) {
        dragPall.vx = 0;
        dragPall.vy = 0;
        canvas.setPointerCapture(e.pointerId);
    } else {
        lisaPall(mouse.x, mouse.y);
    }
});

// Palli lohistamine hiirega
canvas.addEventListener("pointermove", (e) => {
    if (!dragPall) return;

    const mouse = mousePos(e);
    const p = dragPall;

    p.vx = Math.max(-20, Math.min(20, mouse.x - p.x));
    p.vy = Math.max(-20, Math.min(20, mouse.y - p.y));

    p.x = mouse.x;
    p.y = mouse.y;
});

// Laseme palli lahti
function releaseBall() {
    dragPall = null;
}

canvas.addEventListener("pointerup", releaseBall);
canvas.addEventListener("pointercancel", releaseBall);

// Nupp saab classi vajutatud
function buttonAnimation(btn, duration = 100) {
    btn.classList.add("pressed");
    
    setTimeout(() => {
        btn.classList.remove("pressed");
    }, duration);
}

// Lisa pall nupp
document.getElementById("lisa").addEventListener("click", (e) => {
    lisaPall(width / 2, 120);
    buttonAnimation(e.currentTarget);
});

// Gravitatsioon sisse/valja
const gravityBtn = document.getElementById("gravitatsioon");
gravityBtn.classList.remove("pressed");

gravityBtn.addEventListener("click", () => {
    gravity = gravity === 0 ? 0.35 : 0;

    if (gravity === 0) {
        gravityBtn.classList.add("pressed");
    } else {
        gravityBtn.classList.remove("pressed");
    }
});

// Kustutame koik pallid
document.getElementById("kustuta").addEventListener("click", (e) => {
    balls.length = 0;
    document.getElementById("arv").textContent = 0;
    buttonAnimation(e.currentTarget, 1000);
});




// Kolm palli alguses
lisaPall(width * 0.4, height * 0.3);
lisaPall(width * 0.6, height * 0.25);
lisaPall(width * 0.5, height * 0.45);

requestAnimationFrame(update);
