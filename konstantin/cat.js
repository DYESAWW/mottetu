const range = (start, end) => Array.from({ length: end - start }, (_, i) => start + i);

const FRAME_W = 32, FRAME_H = 32;
const COLS = 11;

const MOVE_MS = 800;
const MIN_DIST = 120, MAX_DIST = 225;
const IDLE_DELAY_MS = 5000;

const SWING_MAX_DEG = 8;
const SWING_GAIN = 0.008;
const SWING_SWAY_DEG = 2; 

const DROP_DIST = 120;
const DROP_MS = 350;

const ANIMS = {
	sitting:       { frames: range(352, 360), fps: 3 }, //played by default

	idleItchLeft:  { frames: range(429, 440), fps: 6, loops: 1 },
	idleItchRight: { frames: range(441, 450), fps: 6, loops: 1 },

	dragged:       { frames: [574],           fps: 8 },
	dropping:      { frames: [574, 573, 572], fps: 8, loops: 1 }, 

	walkRight:     { frames: range(66, 74),   fps: 8 },
	walkRightDown: { frames: range(99, 105),  fps: 8 },
	walkDown:      { frames: range(44, 47),   fps: 8 },
	walkLeftDown:  { frames: range(88, 94),   fps: 8 },
	walkLeft:      { frames: range(77, 85),   fps: 8 },
	walkLeftUp:    { frames: range(121, 127), fps: 8 },
	walkUp:        { frames: range(55, 59),   fps: 8 },
	walkRightUp:   { frames: range(110, 116), fps: 8 },
};

const IDLE_ANIMS = ["idleItchLeft", "idleItchRight"]; //idle anims pool

// do not change order. otherwise trigonometric functions will break
const DIRECTIONS = [
	"walkRight",
	"walkRightDown",
	"walkDown",
	"walkLeftDown",
	"walkLeft",
	"walkLeftUp",
	"walkUp",
	"walkRightUp",
];

const cat = document.getElementById("cat");
const sprite = cat.querySelector(".sprite");

cat.style.touchAction = "none";   //  drag on touchscreens instead of scrolling
cat.style.userSelect = "none";
cat.style.cursor = "grab";

function showFrame(index) {
	const col = index % COLS;
	const row = Math.floor(index / COLS);
	sprite.style.backgroundPosition = `${-col * FRAME_W}px ${-row * FRAME_H}px`;
}

let timer, current;
function play(name) {
	if (current === name) return;
	current = name;
	clearInterval(timer);
	const { frames, fps, loops = Infinity } = ANIMS[name];
	let i = 0, played = 0;
	showFrame(frames[0]);
	timer = setInterval(() => {
		i++;
		if (i >= frames.length) {
			played++;
			if (played >= loops) {
				clearInterval(timer);
				onAnimationEnd(name);
				return;
			}
			i = 0;
		}
		showFrame(frames[i]);
	}, 1000 / fps);
}

// ---- sitting / idle logic ----
let idleTimer, lastIdle;

function goSitting() {
	play("sitting");
	scheduleIdle();
}

function scheduleIdle() {
	clearTimeout(idleTimer);
	if (IDLE_ANIMS.length === 0) return;
	idleTimer = setTimeout(() => {
		if (moving || dragging) return;
		// pick a random idle animation, avoiding an immediate repeat when possible
		const pool = IDLE_ANIMS.length > 1
			? IDLE_ANIMS.filter(n => n !== lastIdle)
			: IDLE_ANIMS;
		lastIdle = pool[Math.floor(Math.random() * pool.length)];
		play(lastIdle);
	}, IDLE_DELAY_MS);
}

function onAnimationEnd(name) {
	if (IDLE_ANIMS.includes(name) || name === "dropping") goSitting();
}

// ---- movement ----
function directionFor(dx, dy) {
	const angle = Math.atan2(dy, dx);
	const sector = Math.round(angle / (Math.PI / 4));
	return DIRECTIONS[(sector + 8) % 8];
}

function pickTarget() {
	const x = cat.offsetLeft, y = cat.offsetTop;
	const maxX = innerWidth  - cat.offsetWidth;
	const maxY = innerHeight - cat.offsetHeight;

	let nx = x, ny = y;
	for (let tries = 0; tries < 10; tries++) {
		const angle = Math.random() * Math.PI * 2;
		const dist = MIN_DIST + Math.random() * (MAX_DIST - MIN_DIST);
		nx = x + Math.cos(angle) * dist;
		ny = y + Math.sin(angle) * dist;
		if (nx >= 0 && nx <= maxX && ny >= 0 && ny <= maxY) break;  // fits on screen
	}
	// fallback: clamp if no random try fit
	nx = Math.max(0, Math.min(maxX, nx));
	ny = Math.max(0, Math.min(maxY, ny));
	return { x, y, nx, ny };
}

let moving = false, dragging = false, moveTimer;

cat.addEventListener("mouseenter", () => {
	if (moving || dragging) return;

	const { x, y, nx, ny } = pickTarget();
	if (Math.hypot(nx - x, ny - y) < 1) return;   // nowhere to go

	moving = true;
	clearTimeout(idleTimer);  // cancel any pending idle animation
	play(directionFor(nx - x, ny - y));

	cat.style.transition = `left ${MOVE_MS}ms linear, top ${MOVE_MS}ms linear`;
	cat.style.left = nx + "px";
	cat.style.top  = ny + "px";

	moveTimer = setTimeout(() => {
		moving = false;
		goSitting();
	}, MOVE_MS);
});

// ---- swing ----
cat.style.transformOrigin = "50% 50%";

let angle = 0, angVel = 0, cursorVx = 0, swingRaf = null, lastT = 0;

function swingLoop(t) {
	const dt = Math.min((t - lastT) / 1000, 0.05);
	lastT = t;

	const K = 70;                       // spring stiffness
	const C = dragging ? 5 : 9;         // damping (stronger after release so it settles)

	let target = 0;
	if (dragging) {
		target = -cursorVx * SWING_GAIN + Math.sin(t / 1000 * 5) * SWING_SWAY_DEG;
		target = Math.max(-SWING_MAX_DEG, Math.min(SWING_MAX_DEG, target));
		cursorVx *= 0.9;                // cursor speed fades if the mouse stops
	}

	angVel += (K * (target - angle) - C * angVel) * dt;
	angle += angVel * dt;

	cat.style.transform = `rotate(${angle}deg)`;

	if (dragging || Math.abs(angle) > 0.05 || Math.abs(angVel) > 0.05) {
		swingRaf = requestAnimationFrame(swingLoop);
	} else {
		angle = angVel = 0;
		cat.style.transform = "";
		swingRaf = null;
	}
}

function startSwing() {
	if (swingRaf) return;
	lastT = performance.now();
	swingRaf = requestAnimationFrame(swingLoop);
}

// ---- dragging ----
let lastPX = 0, lastPT = 0;

function moveCatToCursor(e) {
	// the cat's center follows the cursor, clamped to the page
	const maxX = innerWidth  - cat.offsetWidth;
	const maxY = innerHeight - cat.offsetHeight;
	cat.style.left = Math.max(0, Math.min(maxX, e.clientX - cat.offsetWidth  / 2)) + "px";
	cat.style.top  = Math.max(0, Math.min(maxY, e.clientY - cat.offsetHeight / 2)) + "px";
}

cat.addEventListener("pointerdown", (e) => {
	if (e.button !== 0) return;
	e.preventDefault();

	// stop a run-away or fall in progress and freeze the cat where it is right now
	clearTimeout(moveTimer);
	clearTimeout(idleTimer);
	moving = false;
	const cs = getComputedStyle(cat);
	const curLeft = cs.left, curTop = cs.top;      // current animated position
	cat.style.transition = "none";
	cat.style.left = curLeft;
	cat.style.top  = curTop;

	dragging = true;
	cat.setPointerCapture(e.pointerId);
	cat.style.cursor = "grabbing";
	play("dragged");

	lastPX = e.clientX; lastPT = e.timeStamp;
	cursorVx = 0;
	angVel += 40;                                  // small kick so it starts swinging
	moveCatToCursor(e);
	startSwing();
});

cat.addEventListener("pointermove", (e) => {
	if (!dragging) return;
	moveCatToCursor(e);

	const dt = e.timeStamp - lastPT;
	if (dt > 0) {
		const vx = (e.clientX - lastPX) / dt * 1000;     // px/s
		cursorVx = cursorVx * 0.7 + vx * 0.3;            // smoothed
	}
	lastPX = e.clientX; lastPT = e.timeStamp;
});

function endDrag() {
	if (!dragging) return;
	dragging = false;                              // swing keeps running and damps out
	cat.style.cursor = "grab";
	play("dropping");                              // plays once, then goSitting()

	// fall DROP_DIST px, stopping at the bottom of the page
	const maxY = innerHeight - cat.offsetHeight;
	const targetY = Math.min(maxY, cat.offsetTop + DROP_DIST);
	cat.style.transition = `top ${DROP_MS}ms ease-in`;   // ease-in feels like gravity
	cat.style.top = targetY + "px";
}
cat.addEventListener("pointerup", endDrag);
cat.addEventListener("pointercancel", endDrag);

goSitting();