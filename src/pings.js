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

		constructor() {
			game.socket.on(Net.SOCKET_NAME, (data) => {
				if (canvas.scene._id !== data.sceneId) {
					return;
				}

				this._runMessageCallbacks(data.message, data.pingData);
			});
		}

		_messageCallbacks(message) {
			const prop = `_funcs${message}`;
			if (!this[prop]) {
				this[prop] = [];
			}
			return this[prop];
		}

		_runMessageCallbacks(message, pingData) {
			this._messageCallbacks(message).forEach(func => func(pingData));
		}

		on(message, func) {
			this._messageCallbacks(message.name).push(func);
		}

		sendMessage(message, pingData) {
			message.dataProperties.forEach(prop => {
				if (!pingData.hasOwnProperty(prop)) {
					throw new Error(`Missing data for message "${message.name}": ${prop}`);
				}
			});
			Net._emit({
				message: message.name,
				sceneId: canvas.scene._id,
				pingData
			});
		}

		static get SOCKET_NAME() {
			return 'module.pings';
		}

		static get MESSAGES() {
			const defaultPingProperties = [
				'id',
				'position',
				'moveCanvas'
			];
			return {
				USER_PING: {
					name: 'UserPing',
					dataProperties: [
						...defaultPingProperties
					]
				},
				TEXT_PING: {
					name: 'TextPing',
					dataProperties: [
						'text',
						'color',
						...defaultPingProperties
					]
				},
				REMOVE_PING: {
					name: 'RemovePing',
					dataProperties: [
						'id'
					]
				}
			};
		}

		static _emit(...args) {
			game.socket.emit(Net.SOCKET_NAME, ...args)
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

	const DEFAULT_PING_COLOR = 0xAAAAAA;

	function getUserColor(user) {
		return user.color.replace("#", "0x") || DEFAULT_PING_COLOR;
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
				return [
					e,
					(e) => {
						if (this._mouseOnCanvas) h(e.originalEvent || e);
					}
				];
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
			this._registerStageListeners();
		}

		/**
		 * @private
		 */
		_registerStageListeners() {
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
		_triggerPing(moveCanvas) {
			let position = this._getMousePos();
			this.onUserPinged({
				position,
				id: game.user._id,
				moveCanvas
			});
			this.displayUserPing(position, game.user._id, moveCanvas);
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
		 * Displays a ping from a user on the canvas
		 *
		 * @param {{x: Number, y: Number}} position
		 * @param {String} senderId The player who sent the ping
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered
		 */
		displayUserPing(position, senderId, moveCanvas = false) {
			const user = game.users.get(senderId);
			this.removePing(senderId);

			const text = this.options.showName ? user.name : undefined;
			const ping = new Ping(position, senderId, text, getUserColor(user), this.options);
			moveCanvas = moveCanvas && user.hasRole(this.options.minMovePermission);
			this._displayPing(ping, moveCanvas)
		}

		/**
		 * Displays a text ping on the canvas
		 *
		 * @param {{x: Number, y: Number}} position
		 * @param {*} id id for the ping
		 * @param {String} text text to show for the ping
		 * @param {Number} color a 6-digit hexadecimal RBG value
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered
		 */
		displayTextPing(position, id, text, color, moveCanvas = false) {
			const ping = new Ping(position, id, text, color, this.options);
			this._displayPing(ping, moveCanvas);
		}

		/**
		 * @private
		 */
		_displayPing(ping, moveCanvas = false) {
			if (moveCanvas) {
				canvas.animatePan({x: ping.x, y: ping.y});
			}

			this.addChild(ping);
		}

		removePing(id) {
			this.children.filter((ping) => ping.id === id).forEach((ping) => ping.destroy());
		}

		addToStage() {
			canvas.pings = canvas.stage.addChild(this);
			this._registerListeners();
			// when canvas is drawn again, the listeners to the stage get cleared, so register them again
			Hooks.on('canvasReady', () => this._registerStageListeners());
		}
	}

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
	class Ping extends PIXI.Container {

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

	function throwErrorNoColor(color) {
		throwErrorNoNumber(color, `color`);
		if (color < 0 || color > 0xFFFFFF) {
			throw new Error(`The color is not between 0x000000 and 0xFFFFFF`);
		}
	}

	/**
	 * Provides an API for external module authors to show pings. Registered on "Azzu.Pings".
	 */
	class PingsAPI {

		constructor(layer, net) {
			this._layer = layer;
			this._net = net;
		}

		_getId() {
			// an incremental number was considered,
			// but that has more chance of collision between multiple users
			return Math.random().toString(36).substr(2);
		}

		/**
		 * Perform a ping on the canvas as if the given user had performed a ping for all users in the game.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} [userId=game.user._id] userId of the user the ping should originate from
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 * @return {*} a ping id to be able to remove the ping with
		 */
		perform(position, userId = game.user._id, moveCanvas = false) {
			throwOnUserMissing(userId);
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			this._layer.displayUserPing(position, userId, moveCanvas);
			this._net.sendMessage(Net.MESSAGES.USER_PING, {
				id: userId,
				position,
				moveCanvas
			});
			return userId;
		}

		/**
		 * Shows a ping on the canvas as if the given user had sent a ping. Does not send the ping to any other player.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} [userId=game.user._id] userId of the user the ping should originate from
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 * @return {*} a ping id to be able to remove the ping with
		 */
		show(position, userId = game.user._id, moveCanvas = false) {
			throwOnUserMissing(userId);
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			this._layer.displayUserPing(position, userId, moveCanvas);
			return userId;
		}

		/**
		 * Sends a ping to other players as if it was triggered by the given user.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} [userId=game.user._id] userId of the user the ping should originate from
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 */
		send(position, userId = game.user._id, moveCanvas = false) {
			throwOnUserMissing(userId);
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			this._net.sendMessage(Net.MESSAGES.USER_PING, {
				id: userId,
				position,
				moveCanvas
			});
			return userId;
		}

		/**
		 * Performs a ping with custom text on the canvas for all players.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} text a custom text that should be shown below the ping. May be left falsy to not show any
		 *     text.
		 * @param {Number} [color=0xAAAAAA] a 6-digit hexadecimal RGB value from 0x000000 to 0xFFFFFF for the color of
		 *     the ping
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 */
		performText(position, text, color = DEFAULT_PING_COLOR, moveCanvas = false) {
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			throwErrorNoColor(color);
			const id = this._getId();
			this._layer.displayTextPing(position, id, text, color, moveCanvas);
			this._net.sendMessage(Net.MESSAGES.TEXT_PING, {
				position,
				id,
				text,
				color,
				moveCanvas
			});
			return id;
		}

		/**
		 * Shows a ping with custom text on the canvas.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} text a custom text that should be shown below the ping. May be left falsy to not show any
		 *     text.
		 * @param {Number} [color=0xAAAAAA] a 6-digit hexadecimal RGB value from 0x000000 to 0xFFFFFF for the color of
		 *     the ping
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 */
		showText(position, text, color = DEFAULT_PING_COLOR, moveCanvas = false) {
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			throwErrorNoColor(color);
			const id = this._getId();
			this._layer.displayTextPing(position, id, text, color, moveCanvas);
			return id;
		}

		/**
		 * Shows a ping with custom text on the canvas.
		 *
		 * @param {{x: Number, y: Number}} position the position of the ping on the canvas
		 * @param {String} text a custom text that should be shown below the ping. May be left falsy to not show any
		 *     text.
		 * @param {Number} [color=0xAAAAAA] a 6-digit hexadecimal RGB value from 0x000000 to 0xFFFFFF for the color of
		 *     the ping
		 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered.
		 */
		sendText(position, text, color = DEFAULT_PING_COLOR, moveCanvas = false) {
			throwErrorNoNumber(position.x, `position.x`);
			throwErrorNoNumber(position.y, `position.y`);
			throwErrorNoColor(color);
			const id = this._getId();
			this._net.sendMessage(Net.MESSAGES.TEXT_PING, {
				position,
				id,
				text,
				color,
				moveCanvas
			});
			return id;
		}

		/**
		 * Removes a ping that has been created with the other methods of this class.
		 * @param {*} id a ping ID obtained by calling one of the other methods of this class
		 * @param {Boolean} [removeForOthers=true] if the ping should be removed for all users. If false, will only be
		 *     removed locally.
		 */
		remove(id, removeForOthers = true) {
			this._layer.removePing(id);
			if (removeForOthers) {
				this._net.sendMessage(Net.MESSAGES.REMOVE_PING, {id});
			}
		}
	}

	function addNetworkBehavior(net, pingsLayer) {
		net.on(Net.MESSAGES.USER_PING, ({id, position, moveCanvas}) => {
			pingsLayer.displayUserPing(position, id, moveCanvas)
		});

		net.on(Net.MESSAGES.TEXT_PING, ({id, position, text, color, moveCanvas}) => {
			pingsLayer.displayTextPing(position, id, text, color, moveCanvas);
		});

		net.on(Net.MESSAGES.REMOVE_PING, ({id}) => {
			pingsLayer.removePing(id);
		});
	}

	window.Azzu = window.Azzu || {};

	const [Settings] = await preRequisitesReady();
	const net = new Net();
	const pingsLayer = new PingsLayer(Settings, net.sendMessage.bind(net, Net.MESSAGES.USER_PING));
	addNetworkBehavior(net, pingsLayer);
	pingsLayer.addToStage();
	window.Azzu.Pings = new PingsAPI(pingsLayer, net);
	Hooks.callAll('pingsReady', window.Azzu.Pings);
})();
