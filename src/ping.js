/**
 * Up to 0.4.3 tokenTextStyle, after that canvasTextStyle
 * @returns {*}
 */
function getCanvasTextStyle() {
	return CONFIG.tokenTextStyle || CONFIG.canvasTextStyle;
}

/**
 * Adapted from https://gitlab.com/moerills-fvtt-modules/pointer
 */
export default class Ping extends PIXI.Container {

	constructor(pos, id, text, color, options) {
		super();

		this.x = pos.x;
		this.y = pos.y;

		this.id = id;

		this.options = options;

		const gridSize = canvas.scene.data.grid;
		this.pingSize = gridSize * this.options.scale;

		this.ping = this.addChild(this._createPing(color));
		if (text) {
			this.addChild(this._createText(text, color));
		}

		canvas.app.ticker.add(this._animate, this);
	}

	_createPing(color) {
		return this.options.image ? this._createPingImage(color) : this._createDefaultPing(color);
	}

	_createText(text, color) {
		const style = getCanvasTextStyle().clone();
		style.fill = color;

		const name = new PIXI.Text(text, style);
		name.anchor.x = 0.5;
		const maxSizeChange = 1 + (this.options.sizeChange ? this.options.sizeChangeAmount : 0);
		name.y = this.pingSize / 2 * maxSizeChange;

		const height = this.pingSize >= 200 ? 36 : this.pingSize > 50 ? 24 : 18;
		const bounds = name.getBounds();
		const ratio = (bounds.width / bounds.height);
		name.height = height;
		name.width = height * ratio;

		return name;
	}

	_createPingImage(color) {
		const ping = PIXI.Sprite.from(this.options.image);
		ping.tint = color;
		ping.alpha = 0.8;
		ping.anchor.set(0.5, 0.5);
		return ping;
	}

	_createDefaultPing(color) {
		const ping = new PIXI.Container();
		ping.addChild(...this._createShadows());
		ping.addChild(...this._createPingLines(color));
		return ping;
	}

	_createPingLines(color) {
		let offset = this.pingSize * 0.25;
		const lines = [];
		for (let i = 0; i < 4; i++) {
			let line = new PIXI.Graphics();
			line.lineStyle(2, color, 1)
				.moveTo(offset, 0)
				.lineTo(offset * 0.1, offset * 0.1)
				.lineTo(0, offset);

			line.rotation = i * Math.PI / 2;

			lines.push(line);
		}

		offset = offset * 0.25;

		lines[0].x = lines[0].y = offset;
		lines[1].x = -offset;
		lines[1].y = offset;
		lines[2].x = -offset;
		lines[2].y = -offset;
		lines[3].x = offset;
		lines[3].y = -offset;
		return lines;
	}

	_createShadows() {
		const shadows = this._createPingLines(0x000000);
		shadows.forEach(this._addBlurFilter.bind(this));
		return shadows;
	}

	_addBlurFilter(graphic) {
		const blurFilter = new PIXI.filters.BlurFilter(2);
		blurFilter.padding = this.pingSize;
		graphic.filters = [blurFilter];
	}

	_animate() {
		const FADE_IN_DURATION = 500;
		const FADE_OUT_DURATION = 500;

		const animationStarted = this.t === undefined || this.prevTime === undefined;
		if (animationStarted) {
			this.t = 0;
			this.prevTime = Date.now();
			this.ping.rotation = this._rotationDuringTime(-FADE_IN_DURATION);
			this.ping.width = this.ping.height = this.pingSize;
			this.addChild(this.ping);
		}

		const dt = Date.now() - this.prevTime;
		this.prevTime = Date.now();

		const fadeInEndTime = FADE_IN_DURATION;
		const mainAnimationEndTime = fadeInEndTime + this.options.duration * 1000;
		const fadeOutEndTime = mainAnimationEndTime + FADE_OUT_DURATION;

		this.t += dt;

		if (this.options.rotate) {
			this.ping.rotation += this._rotationDuringTime(dt);
		}

		if (this.t < fadeInEndTime) {
			this.scale.x = this.scale.y = this.t / FADE_IN_DURATION;
		} else if (this.t < mainAnimationEndTime) {
			this.scale.x = this.scale.y = 1;
			if (this.options.sizeChange) {
				const sizeChangeFraction = Math.sin(2 * Math.PI * this.t / (this.options.sizeChangeSpeed * 1000));
				const sizeMultiplier = 1 + sizeChangeFraction * this.options.sizeChangeAmount;
				this.ping.width = this.ping.height = this.pingSize * sizeMultiplier;
			}
		} else if (this.t < fadeOutEndTime) {
			this.scale.x = this.scale.y = (fadeOutEndTime - this.t) / FADE_OUT_DURATION;
		} else {
			this.destroy();
		}
	}

	_rotationDuringTime(dt) {
		return 2 * Math.PI * dt / (this.options.rotateSpeed * 1000);
	}

	destroy(options) {
		canvas.app.ticker.remove(this._animate, this);

		super.destroy({
			...options,
			children: true
		});
	}
}
