// import {initNetwork, MESSAGES, onMessageReceived, sendMessage} from './scripts/net';
// import {initApi} from './scripts/api';
// import createPingsGui from './scripts/pings-gui';
// import setupSettings from './scripts/settings/settings';
// import Ping from './scripts/ping';
// import Constants from './scripts/constants';

import { initHooks, readyHooks, setupHooks } from "./scripts/module";
import { registerSettings } from "./scripts/settings/settings";
import CONSTANTS from "./scripts/constants";
import type API from "./scripts/api";
import { addNetworkBehavior, error, localize } from "./scripts/lib/lib";
import { sendMessage } from "./scripts/net";
import createPingsGui from "./scripts/pings-gui";
import Ping from "./scripts/ping";

/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */
// Import JavaScript modules

// Import TypeScript modules

/*
(async () => {
	// const [Settings] = await preRequisitesReady();
	const pingsGui = createPingsGui(window,
		canvas,
		game,
		Hooks,
		Settings,
		localize,
		//@ts-ignore
		(...args) => new Ping(canvas, CONFIG, ...args),
		//@ts-ignore
		sendMessage.bind(null, MESSAGES.USER_PING)
	);
	addNetworkBehavior(pingsGui);
	// const api = initApi(pingsGui);
	// Hooks.callAll('pingsReady', api);
})();
*/

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once("init", async () => {
	console.log(`${CONSTANTS.MODULE_NAME} | Initializing ${CONSTANTS.MODULE_NAME}`);
	// Assign custom classes and constants here

	// Register custom module settings
	registerSettings();

	// Preload Handlebars templates
	// await preloadTemplates();

	// Register custom sheets (if any)
	initHooks();
});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once("setup", function () {
	setupHooks();
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once("ready", () => {
	// Do anything once the module is ready
	if (!game.modules.get("lib-wrapper")?.active && game.user?.isGM) {
		let word = "install and activate";
		if (game.modules.get("lib-wrapper")) word = "activate";
		throw error(`Requires the 'libWrapper' module. Please ${word} it.`);
	}

	readyHooks();
});

/* ------------------------------------ */
/* Other Hooks							*/
/* ------------------------------------ */
export interface PingsLightModuleData {
	api: typeof API;
	socket: any;
}

/**
 * Initialization helper, to set API.
 * @param api to set to game module.
 */
export function setApi(api: typeof API): void {
	const data = game.modules.get(CONSTANTS.MODULE_NAME) as unknown as PingsLightModuleData;
	data.api = api;
}

/**
 * Returns the set API.
 * @returns Api from games module.
 */
export function getApi(): typeof API {
	const data = game.modules.get(CONSTANTS.MODULE_NAME) as unknown as PingsLightModuleData;
	return data.api;
}

/**
 * Initialization helper, to set Socket.
 * @param socket to set to game module.
 */
export function setSocket(socket: any): void {
	const data = game.modules.get(CONSTANTS.MODULE_NAME) as unknown as PingsLightModuleData;
	data.socket = socket;
}

/*
 * Returns the set socket.
 * @returns Socket from games module.
 */
export function getSocket() {
	const data = game.modules.get(CONSTANTS.MODULE_NAME) as unknown as PingsLightModuleData;
	return data.socket;
}
