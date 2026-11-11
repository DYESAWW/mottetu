class SpritePlayer {
	static range(start, end) {
		return Array.from({ length: end - start }, (_, i) => start + i);
	}

	constructor(el, { anims = {}, frameW = null, frameH = null, cols = null } = {}) {
		this.el = el;
		this.anims = anims;
		this.frameW = frameW;
		this.frameH = frameH;
		this.cols = cols;
		this._timer = null;
		this._resolve = null;

		// resolves once the sheet (taken from the element's CSS background) is loaded
		this.ready = new Promise((resolve, reject) => {
			const cs = getComputedStyle(el);
			const match = /url\(["']?(.*?)["']?\)/.exec(cs.backgroundImage);
			if (!match) return reject(new Error("SpritePlayer: the element has no CSS background-image"));

			if (this.frameW === null) this.frameW = parseFloat(cs.width);
			if (this.frameH === null) this.frameH = parseFloat(cs.height);

			const img = new Image();
			img.onload = () => {
				if (this.cols === null) this.cols = Math.floor(img.naturalWidth / this.frameW);
				resolve();
			};
			img.onerror = () => reject(new Error(`SpritePlayer: could not load "${match[1]}"`));
			img.src = match[1];
		});
	}

	showFrame(index) {
		const col = index % this.cols;
		const row = Math.floor(index / this.cols);
		this.el.style.backgroundPosition = `${-col * this.frameW}px ${-row * this.frameH}px`;
	}

	// Interrupts whatever is playing (its promise resolves with false).
	stop() {
		clearInterval(this._timer);
		this._timer = null;
		if (this._resolve) {
			const resolve = this._resolve;
			this._resolve = null;
			resolve(false);
		}
	}

	async play(name, { onFrame = null } = {}) {
		const anim = this.anims[name];
		if (!anim) throw new Error(`SpritePlayer: unknown animation "${name}"`);
		await this.ready;
		this.stop();

		const { frames, fps, loops = Infinity } = anim;

		return new Promise((resolve) => {
			this._resolve = resolve;
			let step = 0, played = 0;

			const show = () => {
				this.showFrame(frames[step]);
				if (onFrame) onFrame(step, frames[step]);
			};
			show();

			this._timer = setInterval(() => {
				step++;
				if (step >= frames.length) {
					played++;
					if (played >= loops) {
						clearInterval(this._timer);
						this._timer = null;
						this._resolve = null;
						resolve(true);
						return;
					}
					step = 0;
				}
				show();
			}, 1000 / fps);
		});
	}
}
