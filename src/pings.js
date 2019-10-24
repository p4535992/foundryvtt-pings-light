(async () => {

	async function preRequisitesReady() {
		return Promise.all([areSettingsLoaded(), isCanvasReady()]);
	}

	async function areSettingsLoaded() {
		return new Promise(resolve => {
			Hooks.once('pingsSettingsReady', resolve);
		});
	}
	async function isCanvasReady() {
		return new Promise(resolve => {
			Hooks.once('canvasReady', resolve);
		});
	}

	class Net {
		static get SOCKET_NAME() {
			return 'module.pings';
		}

		static _emit(...args) {
			game.socket.emit(Net.SOCKET_NAME, ...args)
		}

		static sendPing(position, userId = game.user._id, moveToPing = false) {
			Net._emit({
				sceneId: canvas.scene._id,
				senderId: userId,
				position,
				moveToPing
			});
		}

		static onPingReceived(func) {
			game.socket.on(Net.SOCKET_NAME, (data) => {
				if (canvas.scene._id !== data.sceneId) {
					return;
				}

				func(data.position, data.senderId, data.moveToPing);
			});
		}
	}

	function isWithinPx(p1, p2, px) {
		return Math.abs(p1.x - p2.x) <= px && Math.abs(p1.y - p2.y) <= px;
	}

	function isPressed(e, option, bindingType) {
		const userIsMissingPermission = !option;
		if (userIsMissingPermission) return false;

		const types = window.Azzu.SettingsTypes;
		const type = bindingType === 'mouse' ? types.MouseButtonBinding : types.KeyBinding;
		return type.eventIsForBinding(e, option);
	}

	class PingsLayer extends CanvasLayer {
		constructor(Settings, onUserPinged = () => {}) {
			super();

			this.onUserPinged = onUserPinged;

			this.options = Settings;

			this.pings = {};

			this.globalEventListeners = [
				['keydown', this._onKeyDown],
				['mousedown', this._onMouseDown],
				['mouseup', this._onMouseUp],
			].map(([e, h]) => {
				return [e, h.bind(this)];
			}).map(([e, h]) => {
				return [e, (e) => {
					if (this._mouseOnCanvas) h(e.originalEvent || e);
				}];
			});

			this.stageListeners = [
				['mouseover', this._onMouseOver],
				['mouseout', this._onMouseOut],
			].map(([e, h]) => {
				return [e, h.bind(this)];
			});
		}

		destroy(options) {
			this._unregisterListeners();

			super.destroy({
				...options,
				children: true
			});
		}

		/**
		 * @private
		 */
		_onMouseDown(e) {
			const bindingType = 'mouse';
			const shouldPingMove = isPressed(e, this.options.mouseButtonMove, bindingType);
			const shouldPingNoMove = isPressed(e, this.options.mouseButton, bindingType);
			if (!shouldPingMove && !shouldPingNoMove) return;

			this._mouseDownStart = this._getMousePos();
			this._mouseDownOption = 'mouseButton' + (shouldPingMove ? 'Move' : '');
			this._mouseDownTimeout = setTimeout(() => {
				if (isWithinPx(this._mouseDownStart, this._getMousePos(), 5)) {
					this._triggerPing(shouldPingMove);
				}
			}, this.options.mouseButtonDuration);
		}

		/**
		 * @private
		 */
		_onMouseUp(e) {
			if (this._mouseDownTimeout === undefined) return;
			if (!isPressed(e, this.options[this._mouseDownOption], 'mouse')) return;

			clearTimeout(this._mouseDownTimeout);
			this._mouseDownTimeout = undefined;
		}

		/**
		 * @private
		 */
		_onMouseOver(e) {
			this._mouseOnCanvas = true;
		}
		/**
		 * @private
		 */
		_onMouseOut(e) {
			this._mouseOnCanvas = false;
		}

		/**
		 * @private
		 */
		_registerListeners() {
			this.globalEventListeners.forEach((l) => window.addEventListener(...l));
			this.stageListeners.forEach(l => this.parent.on(...l));
		}

		/**
		 * @private
		 */
		_unregisterListeners() {
			this.globalEventListeners.forEach((l) => window.removeEventListener(...l));
			this.stageListeners.forEach(l => this.parent.off(...l));
		}

		/**
		 * @private
		 */
		_onKeyDown(e) {
			const bindingType = 'keyboard';
			const shouldPingMove = isPressed(e, this.options.keyMove, bindingType);
			const shouldPingNoMove = isPressed(e, this.options.key, bindingType);
			if (!shouldPingMove && !shouldPingNoMove) return;

			this._triggerPing(shouldPingMove);
		}

		/**
		 * @private
		 */
		_triggerPing(moveToPing) {
			let pos = this._getMousePos();
			this.onUserPinged(pos, game.user._id, moveToPing);
			this.displayPing(pos, game.user._id, moveToPing);
		}

		/**
		 * @private
		 */
		_getMousePos() {
			const mouse = canvas.app.renderer.plugins.interaction.mouse.global;
			const t = this.worldTransform;
			function calcCoord(axis) {
				return (mouse[axis] - t['t' + axis]) / canvas.stage.scale[axis];
			}
			return {
				x: calcCoord('x'),
				y: calcCoord('y')
			};
		}

		/**
		 * Displays a ping on the canvas
		 *
		 * @param {{x: Number, y: Number}} position
		 * @param {String} senderId The player who sent the ping
		 * @param {Boolean} shouldMove if the ping should also move the canvas so the ping is centered
		 */
		displayPing(position, senderId, shouldMove = false) {
			const user = game.users.get(senderId);

			if (shouldMove && user.permission >= this.options.minMovePermission) {
				canvas.animatePan(position);
			}

			this.children.filter((ping) => ping.user._id === senderId).forEach((ping) => ping.destroy());

			this.addChild(new Ping(user, position, this.options));
		}

		static addToStage(stage, pingsLayer) {
			canvas.pings = stage.addChild(pingsLayer);
			pingsLayer._registerListeners();
		}
	}

	/**
	 * Adapted from https://gitlab.com/moerills-fvtt-modules/pointer
	 */
	class Ping extends PIXI.Container {

		constructor(user, pos, options) {
			super();

			this.options = options;

			this.user = user;

			this.x = pos.x;
			this.y = pos.y;

			const gridSize = canvas.scene.data.grid;
			this.pingSize = gridSize * this.options.scale;

			this.ping = this.addChild(this._createPing(user));
			if (options.showName) {
				this.addChild(this._createName(user));
			}


			canvas.app.ticker.add(this._animate, this);
		}

		_createPing(user) {
			const color = Ping._getUserColor(user);
			return this.options.image ? this._createPingImage(color) : this._createDefaultPing(color);
		}

		static _getUserColor(user) {
			return user.color.replace("#", "0x") || 0xAAAAAA;
		}

		_createName(user) {
			const style = CONFIG.tokenTextStyle.clone();
			style.fill = Ping._getUserColor(user);

			const name = new PIXI.Text(user.name, style);
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

	function throwErrorNoNumber(num, name) {
		if (typeof num !== `number` || isNaN(num)) {
			throw new Error(`${name} is not a valid number!`);
		}
	}

	function throwOnUserMissing(userId) {
		if (!game.users.get(userId)) {
			throw new Error(`Given userId "${userId}" does not represent a player!`);
		}
	}

	/**
	 * Provides an API for external module authors to show pings. Registered on "Azzu.Pings".
	 */
	class PingsAPI {

		constructor(layer, net) {
			this.layer = layer;
			this.net = net;
		}

		/**
		 * Shows a ping on the canvas as if the given user had sent a ping for all users in the game.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} [userId=game.user._id] userId of the user the ping should originate from
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 */
		show(position, userId = game.user._id, moveCanvas = false) {
			this.showLocal(position, userId, moveCanvas);
			this.send(position, userId, moveCanvas);
		}

		/**
		 * Shows a ping on the canvas as if the given user had sent a ping. Does not send the ping to any other player.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} [userId=game.user._id] userId of the user the ping should originate from
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 */
		showLocal(position, userId = game.user._id, moveCanvas = false) {
			throwOnUserMissing(userId);
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			pingsLayer.displayPing(position, userId, moveCanvas);
		}

		/**
		 * Sends a ping to other players as if it was triggered by the given user.
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} [userId=game.user._id] userId of the user the ping should originate from
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 */
		send(position, userId = game.user._id, moveCanvas = false) {
			throwOnUserMissing(userId);
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			Net.sendPing(position, userId, moveCanvas);
		}
	}


	window.Azzu = window.Azzu || {};


	const [Settings] = await preRequisitesReady();
	const pingsLayer = new PingsLayer(Settings, Net.sendPing);
	Net.onPingReceived((...args) => pingsLayer.displayPing(...args));
	PingsLayer.addToStage(canvas.stage, pingsLayer);
	window.Azzu.Pings = new PingsAPI(pingsLayer, Net);
})();
