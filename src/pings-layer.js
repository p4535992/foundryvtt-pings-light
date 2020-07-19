import Ping from './ping.js';

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

export default class PingsLayer extends CanvasLayer {
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
					h(e.originalEvent || e);
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
		if (!this._mouseOnCanvas) return;
		const bindingType = 'mouse';
		const shouldPingMove = isPressed(e, this.options.mouseButtonMove, bindingType);
		const shouldPingNoMove = isPressed(e, this.options.mouseButton, bindingType);
		if (!shouldPingMove && !shouldPingNoMove) return;

		this._mouseDownStart = this._getMousePos();
		this._mouseDownOption = 'mouseButton' + (shouldPingMove ? 'Move' : '');
		this._mouseDownTimeout = setTimeout(() => {
			if (this._mouseOnCanvas && isWithinPx(this._mouseDownStart, this._getMousePos(), 5)) {
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
		if (!this._mouseOnCanvas) return;
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
