import {initNetwork, sendMessage, onMessageReceived, MESSAGES} from './net.js';
import {initApi} from './api.js';
import PingsLayer from './pings-layer.js';


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
	const pingsLayer = new PingsLayer(Settings, sendMessage.bind(null, MESSAGES.USER_PING));
	addNetworkBehavior(pingsLayer);
	pingsLayer.addToStage();
	const api = initApi(pingsLayer);
	Hooks.callAll('pingsReady', api);
})();
