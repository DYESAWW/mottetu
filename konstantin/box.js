(() => {
	const IDLE_DELAY_MS = 3000;  // threshold before idle

	const ANIMS = {
		jumping: { frames: SpritePlayer.range(0, 10),  fps: 8 },
		open:    { frames: SpritePlayer.range(10, 18), fps: 6, loops: 1 },
	};
	const IDLE_ANIM = "jumping";
	const ANIM = "open";
	const SWAP_AT_STEP = 4;

	const box = document.getElementById("box");
	const cat = document.getElementById("cat");
	const player = new SpritePlayer(box.querySelector(".box-sprite"), { anims: ANIMS });

	let swapped = false;
	function swap() {
		if (swapped) return;
		swapped = true;
		cat.hidden = false;                // CSS: the cat jumps out in front of the box
		box.classList.add("fade-out");     // CSS: the box fades away behind it
	}

	// idle: start jumping after the delay (a click before that cancels it)
	const idleTimer = setTimeout(() => {
		player.play(IDLE_ANIM).catch((err) => console.warn(err));
	}, IDLE_DELAY_MS);

	box.addEventListener("click", () => {
		clearTimeout(idleTimer);
		// play() stops the idle loop first, so "open" always takes over
		player.play(ANIM, {
			onFrame: (step) => {
				if (SWAP_AT_STEP !== null && step >= SWAP_AT_STEP) swap();
			},
		}).then(swap).catch((err) => {
			console.warn(err);    // e.g. the sheet failed to load: still give them the cat
			swap();
		});
	}, { once: true }); // ignore further clicks while it plays
})();