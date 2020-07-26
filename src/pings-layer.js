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

function onMouseDown(layer, e) {
	if (!layer._mouseOnCanvas) return;
	const bindingType = 'mouse';
	const shouldPingMove = isPressed(e, layer.options.mouseButtonMove, bindingType);
	const shouldPingNoMove = isPressed(e, layer.options.mouseButton, bindingType);
	if (!shouldPingMove && !shouldPingNoMove) return;

	layer._mouseDownStart = getMousePos(layer);
	layer._mouseDownOption = 'mouseButton' + (shouldPingMove ? 'Move' : '');
	layer._mouseDownTimeout = setTimeout(() => {
		if (layer._mouseOnCanvas && isWithinPx(layer._mouseDownStart, getMousePos(layer), 5)) {
			layer.triggerPing(shouldPingMove);
		}
	}, layer.options.mouseButtonDuration);
}

function onMouseUp(layer, e) {
	if (layer._mouseDownTimeout === undefined) return;
	if (!isPressed(e, layer.options[layer._mouseDownOption], 'mouse')) return;

	clearTimeout(layer._mouseDownTimeout);
	layer._mouseDownTimeout = undefined;
}

function onMouseOver(layer, e) {
	layer._mouseOnCanvas = true;
}

function onMouseOut(layer, e) {
	layer._mouseOnCanvas = false;
}

function registerListeners(layer) {
	layer.globalEventListeners.forEach((l) => window.addEventListener(...l));
	registerStageListeners(layer);
}

function registerStageListeners(layer) {
	layer.stageListeners.forEach(l => layer.parent.on(...l));
}

function unregisterListeners(layer) {
	layer.globalEventListeners.forEach((l) => window.removeEventListener(...l));
	layer.stageListeners.forEach(l => layer.parent.off(...l));
}

function onKeyDown(layer, e) {
	if (!layer._mouseOnCanvas) return;
	const bindingType = 'keyboard';
	const shouldPingMove = isPressed(e, layer.options.keyMove, bindingType);
	const shouldPingNoMove = isPressed(e, layer.options.key, bindingType);
	if (!shouldPingMove && !shouldPingNoMove) return;

	layer.triggerPing(shouldPingMove);
}


function getMousePos(layer) {
	const mouse = canvas.app.renderer.plugins.interaction.mouse.global;
	const t = layer.worldTransform;

	function calcCoord(axis) {
		return (mouse[axis] - t['t' + axis]) / canvas.stage.scale[axis];
	}

	return {
		x: calcCoord('x'),
		y: calcCoord('y')
	};
}

function displayPing(layer, foundryCanvas, ping, moveCanvas = false) {
	if (moveCanvas) {
		foundryCanvas.animatePan({x: ping.x, y: ping.y});
	}

	layer.addChild(ping);
}

export class PingsLayer extends CanvasLayer {
	constructor(Settings, foundryCanvas, foundryGame, createPing, onUserPinged = () => {}) {
		super();

		this.options = Settings;
		this.foundryCanvas = foundryCanvas;
		this.foundryGame = foundryGame;
		this.createPing = createPing;
		this.onUserPinged = onUserPinged;

		this.pings = {};

		this.globalEventListeners = [
			['keydown', onKeyDown],
			['mousedown', onMouseDown],
			['mouseup', onMouseUp],
		].map(([e, h]) => {
			return [e, h.bind(null, this)];
		}).map(([e, h]) => {
			return [
				e,
				(e) => {
					h(e.originalEvent || e);
				}
			];
		});

		this.stageListeners = [
			['mouseover', onMouseOver],
			['mouseout', onMouseOut],
		].map(([e, h]) => {
			return [e, h.bind(null, this)];
		});
	}

	destroy(options) {
		unregisterListeners(this);

		super.destroy({
			...options,
			children: true
		});
	}

	/**
	 * Triggers a ping from the current user at the current mouse location
	 *
	 * @param moveCanvas if the canvas should be moved
	 */
	triggerPing(moveCanvas) {
		let position = getMousePos(this);
		this.onUserPinged({
			position,
			id: this.foundryGame.user._id,
			moveCanvas
		});
		this.displayUserPing(position, this.foundryGame.user._id, moveCanvas);
	}

	/**
	 * Displays a ping from a user on the canvas
	 *
	 * @param {{x: Number, y: Number}} position
	 * @param {String} senderId The player who sent the ping
	 * @param {Boolean} [moveCanvas=false] if the ping should also move the canvas so the ping is centered
	 */
	displayUserPing(position, senderId, moveCanvas = false) {
		const user = this.foundryGame.users.get(senderId);
		this.removePing(senderId);

		const text = this.options.showName ? user.name : undefined;
		const ping = this.createPing(position, senderId, text, getUserColor(user), this.options);
		moveCanvas = moveCanvas && user.hasRole(this.options.minMovePermission);
		displayPing(this, this.foundryCanvas, ping, moveCanvas)
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
		const ping = this.createPing(position, id, text, color, this.options);
		displayPing(this, this.foundryCanvas, ping, moveCanvas);
	}

	removePing(id) {
		this.children.filter((ping) => ping.id === id).forEach((ping) => ping.destroy());
	}
}

export function addToStage(layer) {
	canvas.pings = canvas.stage.addChild(layer);
	registerListeners(layer);
	// when canvas is drawn again, the listeners to the stage get cleared, so register them again
	Hooks.on('canvasReady', () => registerStageListeners(layer));
}
