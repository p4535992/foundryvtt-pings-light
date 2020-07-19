import {initNetwork, MESSAGES, onMessageReceived, sendMessage} from './net.js';
import {initApi} from './api.js';
import {addToStage, PingsLayer} from './pings-layer.js';
import setupSettings from './settings/settings.js';
import Ping from './ping.js';


async function preRequisitesReady() {
	return Promise.all([areSettingsLoaded(), isCanvasReady()]);
}

async function areSettingsLoaded() {
	return new Promise(resolve => {
		Hooks.once('ready', () => {
			resolve(setupSettings(game));
		});
	});
}

async function isCanvasReady() {
	return new Promise(resolve => {
		Hooks.once('canvasReady', resolve);
	});
}

function addNetworkBehavior(pingsLayer) {
	onMessageReceived(MESSAGES.USER_PING, ({id, position, moveCanvas}) => {
		pingsLayer.displayUserPing(position, id, moveCanvas)
	});

	onMessageReceived(MESSAGES.TEXT_PING, ({id, position, text, color, moveCanvas}) => {
		pingsLayer.displayTextPing(position, id, text, color, moveCanvas);
	});

	onMessageReceived(MESSAGES.REMOVE_PING, ({id}) => {
		pingsLayer.removePing(id);
	});
}

(async () => {
	const [Settings] = await preRequisitesReady();
	initNetwork();
	const pingsLayer = new PingsLayer(Settings,
		canvas,
		game,
		(...args) => new Ping(canvas, CONFIG, ...args),
		sendMessage.bind(null, MESSAGES.USER_PING)
	);
	addNetworkBehavior(pingsLayer);
	addToStage(pingsLayer);
	const api = initApi(pingsLayer);
	Hooks.callAll('pingsReady', api);
})();
