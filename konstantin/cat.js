const range = (start, end) => Array.from({ length: end - start }, (_, i) => start + i);

const FRAME_W = 32, FRAME_H = 32;
const COLS = 11;

const MOVE_MS = 800;
const MIN_DIST = 150, MAX_DIST = 250;
const IDLE_DELAY_MS = 5000;

const SWING_MAX_DEG = 8;
const SWING_GAIN = 0.008;
const SWING_SWAY_DEG = 2; 

const DROP_DIST = 50;
const DROP_MS = 200;

const FLEE_SPREAD_DEG = 60;
// If the cat is cornered and nothing fits inside the cone, widen to +/- 90deg (slide along the wall,
// still never toward the cursor).
const FLEE_SPREAD_FALLBACK_DEG = 90;

// ---- shadow ----
const SHADOW_GRAB_SCALE = 0.55;    // shadow size while held
const SHADOW_GRAB_OPACITY = 0.5;
const LIFT_PX = 14;                // how far the sprite rises above its shadow while held
const GRAB_MS = 150;
const SHADOW_BOTTOM = "14%";       // distance from the bottom of the cat (bigger = shadow closer / higher up)
const SHADOW_WIDTH = "55%";
const SHADOW_HEIGHT = "16%";
const SHADOW_PX_W = 14, SHADOW_PX_H = 5;   // resolution of the pixel-art shadow
// [max normalised distance from centre, alpha]: checked in order, so edges get the lowest alpha
const SHADOW_LEVELS = [[0.55, 0.45], [0.8, 0.28], [1.0, 0.12]];

// ---- footsteps ----
const STEP_DIST = 22;              // px travelled between two prints
const PAW_SIZE = 4;                // px, side of each square footstep
const PAW_SIDE_OFFSET = 5;         // px, distance of each paw from the centre line of travel
const PAW_COLOR = "#000000";
const PAW_OPACITY = 0.35;
const PAW_LIFETIME_MS = 4000;      // time before a print has fully faded
const FEET_Y_FRAC = 0.35;          // feet position below the cat's centre, as a fraction of cat height

const ANIMS = {
	sitting:       { frames: range(352, 360), fps: 3 }, //played by default

	idleItchLeft:   { frames: range(429, 440), fps: 6, loops: 1 },
	idleItchRight:  { frames: range(441, 450), fps: 6, loops: 1 },
	idleWashSit:    { frames: range(396, 405), fps: 4, loops: 1 },
	idleMeowSit:    { frames: range(308, 311), fps: 3, loops: 1 },
	idleSleepRight: { frames: range(198, 200), fps: 1, loops: 4 },
	idleSleepLeft:  { frames: range(209, 211), fps: 1, loops: 4 },
	idleStandUp:    { frames: range(572, 576), fps: 2, loops: 1 },

	dragged:        { frames: [574],           fps: 8 },
	dropping:       { frames: [574, 573, 572], fps: 8, loops: 1 }, 

	walkRight:      { frames: range(66, 74),   fps: 8 },
	walkRightDown:  { frames: range(99, 105),  fps: 8 },
	walkDown:       { frames: range(44, 47),   fps: 8 },
	walkLeftDown:   { frames: range(88, 94),   fps: 8 },
	walkLeft:       { frames: range(77, 85),   fps: 8 },
	walkLeftUp:     { frames: range(121, 127), fps: 8 },
	walkUp:         { frames: range(55, 59),   fps: 8 },
	walkRightUp:    { frames: range(110, 116), fps: 8 },
};

const IDLE_ANIMS = ["idleItchLeft", "idleItchRight", "idleWashSit", "idleMeowSit", "idleSleepRight", "idleSleepLeft", "idleStandUp"]; //idle anims pool

// ---- sound effects ----
const SOUNDS = {
	idleMeowSit: "../assets/meow.mp3",
	awp:  "../assets/awp.mp3",     // example: add more sounds here
};
const SOUND_VOLUME = 0.1;          // from 0 to 1

const sounds = {};
for (const [name, src] of Object.entries(SOUNDS)) {
	const audio = new Audio(src);
	audio.preload = "auto";
	audio.volume = SOUND_VOLUME;
	sounds[name] = audio;
}

// resolves true if the sound started, false if it couldn't (unknown name, or blocked by the browser)
function playSound(name) {
	const audio = sounds[name];
	if (!audio) return Promise.resolve(false);
	audio.currentTime = 0;
	return audio.play().then(
		() => true,
		(err) => { console.warn("cat sound:", err.message); return false; }
	);
}

// plays a sound `delayMs` after the page has finished loading
function playSoundAfterLoad(name, delayMs = 0) {
	if (!sounds[name]) return;

	const run = () => setTimeout(async () => {
		if (await playSound(name)) return;
		const retry = () => playSound(name);
		addEventListener("pointerdown", retry, { once: true });
		addEventListener("keydown", retry, { once: true });
	}, delayMs);

	if (document.readyState === "complete") run();
	else addEventListener("load", run, { once: true });
}

playSoundAfterLoad("awp", 1650);

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

// ---- shadow ----
if (getComputedStyle(sprite).position === "static") sprite.style.position = "relative";
sprite.style.zIndex = "1";

function makePixelShadowURL() {
	const c = document.createElement("canvas");
	c.width = SHADOW_PX_W;
	c.height = SHADOW_PX_H;
	const g = c.getContext("2d");
	for (let py = 0; py < SHADOW_PX_H; py++) {
		for (let px = 0; px < SHADOW_PX_W; px++) {
			// normalised distance of the pixel centre from the ellipse centre (1 = ellipse edge)
			const dx = (px + 0.5 - SHADOW_PX_W / 2) / (SHADOW_PX_W / 2);
			const dy = (py + 0.5 - SHADOW_PX_H / 2) / (SHADOW_PX_H / 2);
			const d = Math.hypot(dx, dy);
			let a = 0;
			for (const [maxD, alpha] of SHADOW_LEVELS) {
				if (d <= maxD) { a = alpha; break; }
			}
			if (a > 0) {
				g.fillStyle = `rgba(0,0,0,${a})`;
				g.fillRect(px, py, 1, 1);
			}
		}
	}
	return c.toDataURL();
}

const SHADOW_IMAGE = `url(${makePixelShadowURL()})`;
document.documentElement.style.setProperty("--pixel-shadow", SHADOW_IMAGE);

const shadow = document.createElement("div");
Object.assign(shadow.style, {
	position: "absolute",
	left: "50%",
	bottom: SHADOW_BOTTOM,
	width: SHADOW_WIDTH,
	height: SHADOW_HEIGHT,
	translate: "-50% 0",
	backgroundImage: SHADOW_IMAGE,
	backgroundSize: "100% 100%",
	imageRendering: "pixelated",
	pointerEvents: "none",
	zIndex: "0",
	scale: "1",
	opacity: "1",
});
cat.prepend(shadow);

function setLifted(lifted, ms, easing) {
	const t = `${ms}ms ${easing}`;
	shadow.style.transition = `scale ${t}, opacity ${t}`;
	sprite.style.transition = `translate ${t}`;
	shadow.style.scale = lifted ? String(SHADOW_GRAB_SCALE) : "1";
	shadow.style.opacity = lifted ? String(SHADOW_GRAB_OPACITY) : "1";
	sprite.style.translate = lifted ? `0 -${LIFT_PX}px` : "0 0";
}

// ---- footsteps ----
const stepLayer = document.createElement("div");
Object.assign(stepLayer.style, {
	position: "fixed",
	inset: "0",
	pointerEvents: "none",
	overflow: "hidden",
	zIndex: "0",
});
document.body.appendChild(stepLayer);
// keep the cat above the prints
if (getComputedStyle(cat).zIndex === "auto") cat.style.zIndex = "1";

function placePaw(x, y, heading, side) {
	// side = +1 / -1: the paw is shifted perpendicular to the direction of travel
	const px = x + Math.cos(heading + Math.PI / 2) * PAW_SIDE_OFFSET * side;
	const py = y + Math.sin(heading + Math.PI / 2) * PAW_SIDE_OFFSET * side;

	const paw = document.createElement("div");
	Object.assign(paw.style, {
		position: "absolute",
		left: px - PAW_SIZE / 2 + "px",
		top: py - PAW_SIZE / 2 + "px",
		width: PAW_SIZE + "px",
		height: PAW_SIZE + "px",
		backgroundColor: PAW_COLOR,
		opacity: String(PAW_OPACITY),
		transition: `opacity ${PAW_LIFETIME_MS}ms ease-in`,
	});
	stepLayer.appendChild(paw);

	// start the fade on the next frame, then clean up
	requestAnimationFrame(() => requestAnimationFrame(() => { paw.style.opacity = "0"; }));
	setTimeout(() => paw.remove(), PAW_LIFETIME_MS + 100);
}

function feetPoint() {
	const r = cat.getBoundingClientRect();
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 + r.height * FEET_Y_FRAC };
}

// Each run gets its own token. Starting a new run invalidates the previous loop, so two loops
// can never be alive at once (when the cat flees again right as the last run ends, `moving`
// flips false -> true within the same tick and the old loop would otherwise keep going).
let stepToken = 0;

function startFootsteps(heading) {
	const myToken = ++stepToken;
	let last = feetPoint();
	let dist = 0;
	let side = 1;

	placePaw(last.x, last.y, heading, side);
	side = -side;

	function tick() {
		if (!moving || myToken !== stepToken) return;   // stops on arrival, when grabbed, or when superseded
		const p = feetPoint();
		dist += Math.hypot(p.x - last.x, p.y - last.y);
		last = p;
		while (dist >= STEP_DIST) {
			dist -= STEP_DIST;
			placePaw(p.x, p.y, heading, side);
			side = -side;                      // left paw, right paw, left paw ...
		}
		requestAnimationFrame(tick);
	}
	requestAnimationFrame(tick);
}

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
	playSound(name);
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
		if (cat.hidden) { scheduleIdle(); return; }   // still in the box: try again later
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

// Pick a run-away target relative to where the cursor entered the cat.
function pickTarget(cursorX, cursorY) {
	const x = cat.offsetLeft, y = cat.offsetTop;
	const maxX = innerWidth  - cat.offsetWidth;
	const maxY = innerHeight - cat.offsetHeight;

	// direction pointing from the cursor through the cat's centre = "straight away"
	const r = cat.getBoundingClientRect();
	const awayAngle = Math.atan2(
		(r.top  + r.height / 2) - cursorY,
		(r.left + r.width  / 2) - cursorX
	);

	let nx = x, ny = y;
	let found = false;
	for (const spreadDeg of [FLEE_SPREAD_DEG, FLEE_SPREAD_FALLBACK_DEG]) {
		const spread = spreadDeg * Math.PI / 180;
		for (let tries = 0; tries < 10 && !found; tries++) {
			const a = awayAngle + (Math.random() * 2 - 1) * spread;
			const dist = MIN_DIST + Math.random() * (MAX_DIST - MIN_DIST);
			nx = x + Math.cos(a) * dist;
			ny = y + Math.sin(a) * dist;
			if (nx >= 0 && nx <= maxX && ny >= 0 && ny <= maxY) found = true;   // fits on screen
		}
		if (found) break;
	}
	// fallback: clamp if no random try fit
	nx = Math.max(0, Math.min(maxX, nx));
	ny = Math.max(0, Math.min(maxY, ny));
	return { x, y, nx, ny };
}

let moving = false, dragging = false, moveTimer;

// last known cursor position (mouseenter won't fire again if the cursor never leaves the cat)
let mouseX = null, mouseY = null;
document.addEventListener("pointermove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

function cursorOverCat() {
	if (mouseX === null) return false;
	const r = cat.getBoundingClientRect();
	return mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom;
}

cat.addEventListener("mouseenter", (e) => {
	mouseX = e.clientX; mouseY = e.clientY;
	flee(e.clientX, e.clientY);
});

// true while the CSS jump-out animation (cat leaving the box) is running
function jumpingOut() {
	return cat.getAnimations().some(a => a.animationName === "jump-out");
}

// the cursor is usually still on the cat when it appears (you just clicked the box there)
cat.addEventListener("animationend", (e) => {
	if (e.animationName === "jump-out" && cursorOverCat()) flee(mouseX, mouseY);
});

function flee(cursorX, cursorY) {
	if (moving || dragging || jumpingOut()) return;

	const { x, y, nx, ny } = pickTarget(cursorX, cursorY);
	if (Math.hypot(nx - x, ny - y) < 1) return;   // nowhere to go

	moving = true;
	clearTimeout(idleTimer);  // cancel any pending idle animation
	play(directionFor(nx - x, ny - y));

	cat.style.transition = `left ${MOVE_MS}ms linear, top ${MOVE_MS}ms linear`;
	cat.style.left = nx + "px";
	cat.style.top  = ny + "px";

	startFootsteps(Math.atan2(ny - y, nx - x));

	moveTimer = setTimeout(() => {
		moving = false;
		goSitting();
		// the cursor may still be on the cat (e.g. it followed or was parked here): run again
		if (cursorOverCat()) flee(mouseX, mouseY);
	}, MOVE_MS);
}

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
	moving = false;                                // also stops the footstep loop
	const cs = getComputedStyle(cat);
	const curLeft = cs.left, curTop = cs.top;      // current animated position
	cat.style.transition = "none";
	cat.style.left = curLeft;
	cat.style.top  = curTop;

	dragging = true;
	cat.setPointerCapture(e.pointerId);
	cat.style.cursor = "grabbing";
	play("dragged");
	setLifted(true, GRAB_MS, "ease-out");          // cat rises, shadow shrinks

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

	// the shadow grows back over the same time the cat descends, same easing
	setLifted(false, DROP_MS, "ease-in");
}
cat.addEventListener("pointerup", endDrag);
cat.addEventListener("pointercancel", endDrag);

goSitting();