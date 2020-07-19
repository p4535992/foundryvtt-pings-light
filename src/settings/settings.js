import Constants from '../constants.js';
import {migrate, MigrationResult} from './migration.js';

/**
 * May only be called after the foundry game.settings object is fully initialized
 * @returns {Promise<void>}
 */
export default async function setupSettings() {
	const settings = {};
	registerPingsSettings(settings);
	const migrationResult = await migrate();
	if (migrationResult === MigrationResult.FAILED) {
		alert('The settings of the "Pings" module could not be updated after you or your GM installed a new ' +
			'version. If you encounter any issues or this message keeps showing up, please disable the module ' +
			'and contact me on Discord (Azzurite#2004) or file an issue at ' +
			'https://gitlab.com/foundry-azzurite/pings/issues');
	} else if (typeof migrationResult === 'string' && migrationResult !== '1.2.2') {
		ChatMessage.create({
			speaker: {alias: 'Pings Module Notification'},
			content: `You have updated the Pings module to at least v${migrationResult}. The module settings ` +
				'structure has changed, so the settings were successfully migrated. You may have to reload this ' +
				'page for the settings menu to work correctly.',
			whisper: [game.user._id],
			timestamp: Date.now()
		});
	}
	return settings;
}

// Definitions

function registerMovePermissions(settings) {
	const choices = Object.entries(CONST.USER_ROLES)
		.filter(([key, val]) => val !== 0)
		.reduce((choices, [permission, val]) => {
			choices[val] = permission;
			return choices;
		}, {});
	register(settings, Constants.MINIMUM_PERMISSION, {
		name: game.i18n.localize('PINGS.settings.minMovePermission.title'),
		hint: game.i18n.localize('PINGS.settings.minMovePermission.hint'),
		default: 1,
		isSelect: true,
		choices: choices,
		type: Number,
		scope: "world"
	});
	return settings[Constants.MINIMUM_PERMISSION];
}

function registerPingsSettings(settings) {
	const extraTypes = window.Azzu.SettingsTypes;

	const minMovePermission = registerMovePermissions(settings);

	register(settings, 'mouseButton', {
		name: game.i18n.localize('PINGS.settings.mouseButton.title'),
		hint: game.i18n.localize('PINGS.settings.mouseButton.hint'),
		default: 'LeftClick',
		type: extraTypes.MouseButtonBinding
	});
	if (game.user.hasRole(minMovePermission)) {
		register(settings, 'mouseButtonMove', {
			name: game.i18n.localize('PINGS.settings.mouseButtonMove.title'),
			hint: game.i18n.localize('PINGS.settings.mouseButtonMove.hint'),
			default: 'Shift + LeftClick',
			type: extraTypes.MouseButtonBinding
		});
	}
	register(settings, 'mouseButtonDuration', {
		name: game.i18n.localize('PINGS.settings.mouseButtonDuration.title'),
		hint: game.i18n.localize('PINGS.settings.mouseButtonDuration.hint'),
		default: 350,
		type: Number
	});
	register(settings, 'key', {
		name: game.i18n.localize('PINGS.settings.key.title'),
		hint: game.i18n.localize('PINGS.settings.key.hint'),
		default: '',
		type: extraTypes.KeyBinding
	});
	if (game.user.hasRole(minMovePermission)) {
		register(settings, 'keyMove', {
			name: game.i18n.localize('PINGS.settings.keyMove.title'),
			hint: game.i18n.localize('PINGS.settings.keyMove.hint'),
			default: '',
			type: extraTypes.KeyBinding
		});
	}
	register(settings, 'showName', {
		name: game.i18n.localize('PINGS.settings.showName.title'),
		hint: game.i18n.localize('PINGS.settings.showName.hint'),
		default: true,
		type: Boolean
	});
	register(settings, 'image', {
		name: game.i18n.localize('PINGS.settings.image.title'),
		hint: game.i18n.localize('PINGS.settings.image.hint'),
		default: '',
		type: extraTypes.FilePickerImage
	});
	register(settings, 'scale', {
		name: game.i18n.localize('PINGS.settings.scale.title'),
		hint: game.i18n.localize('PINGS.settings.scale.hint'),
		default: 1,
		type: Number
	});
	register(settings, 'duration', {
		name: game.i18n.localize('PINGS.settings.duration.title'),
		hint: game.i18n.localize('PINGS.settings.duration.hint'),
		default: 6,
		type: Number
	});
	register(settings, 'rotate', {
		name: game.i18n.localize('PINGS.settings.rotate.title'),
		hint: game.i18n.localize('PINGS.settings.rotate.hint'),
		default: true,
		type: Boolean
	});
	register(settings, 'rotateSpeed', {
		name: game.i18n.localize('PINGS.settings.rotateSpeed.title'),
		hint: game.i18n.localize('PINGS.settings.rotateSpeed.hint'),
		default: 6,
		type: Number
	});
	register(settings, 'sizeChange', {
		name: game.i18n.localize('PINGS.settings.sizeChange.title'),
		hint: game.i18n.localize('PINGS.settings.sizeChange.hint'),
		default: true,
		type: Boolean
	});
	register(settings, 'sizeChangeAmount', {
		name: game.i18n.localize('PINGS.settings.sizeChangeAmount.title'),
		hint: game.i18n.localize('PINGS.settings.sizeChangeAmount.hint'),
		default: 0.125,
		type: Number
	});
	register(settings, 'sizeChangeSpeed', {
		name: game.i18n.localize('PINGS.settings.sizeChangeSpeed.title'),
		hint: game.i18n.localize('PINGS.settings.sizeChangeSpeed.hint'),
		default: 3,
		type: Number
	});

}

function register(settings, key, data) {
	const dataWithDefaults = {
		scope: 'client',
		type: String,
		config: true,
		...data
	};
	defineSetting(settings, key, dataWithDefaults.type);
	game.settings.register(Constants.PINGS, key, dataWithDefaults);
}

function defineSetting(settings, key, type) {
	const get = () => game.settings.get(Constants.PINGS, key);
	const set = (val) => game.settings.set(Constants.PINGS, key, val);
	let getset;
	if (type.parse && Object.values(window.Azzu.SettingsTypes).includes(type)) {
		getset = {
			get: () => type.parse(get()),
			set: (val) => set(type.format(val))
		};
	} else {
		getset = {
			get,
			set
		};
	}
	if (!settings.hasOwnProperty(key)) Object.defineProperty(settings, key, getset);
}
