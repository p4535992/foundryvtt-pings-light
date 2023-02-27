import { initApi } from "./api";
import { addNetworkBehavior, localize } from "./lib/lib";
import { sendMessage, MESSAGES } from "./net";
import Ping from "./ping";
import createPingsGui from "./pings-gui";

export const initHooks = () => {};

export const setupHooks = async (): Promise<void> => {
	//@ts-ignore
	setApi(API);
};

export const readyHooks = async () => {
	const pingsGui = createPingsGui(
		window,
		canvas,
		game,
		Hooks,
		Settings,
		localize,
		//@ts-ignore
		(...args) => new Ping(canvas, CONFIG, ...args),
		sendMessage.bind(null, MESSAGES.USER_PING)
	);
	addNetworkBehavior(pingsGui);
	const api = initApi(pingsGui);
	Hooks.callAll("pingsReady", api);
};
