/**
 * window.AzzuriteTV.PingsSettings is guaranteed to be initialized after Hooks->init
 */
(() => {
	window.AzzuriteTV = window.AzzuriteTV || {};
	const Settings = window.AzzuriteTV.PingsSettings = window.AzzuriteTV.PingsSettings || function PingsSettings(){};

	Hooks.once('init', () => {
		registerPingsSettings();
	});

	// Definitions

	function registerPingsSettings() {
		const extraTypes = window.AzzuriteTV.SettingsTypes;

		register('mouseButton', {
			name: game.i18n.localize('PINGS.mouseButton.title'),
			hint: game.i18n.localize('PINGS.mouseButton.hint'),
			default: 'LeftClick',
			type: extraTypes.MouseButtonSelector
		});
		register('mouseButtonMove', {
			name: game.i18n.localize('PINGS.mouseButtonMove.title'),
			hint: game.i18n.localize('PINGS.mouseButtonMove.hint'),
			default: 'Shift + LeftClick',
			type: extraTypes.MouseButtonSelector
		});
		register('mouseButtonDuration', {
			name: game.i18n.localize('PINGS.mouseButtonDuration.title'),
			hint: game.i18n.localize('PINGS.mouseButtonDuration.hint'),
			default: 350,
			type: Number
		});
		register('key', {
			name: game.i18n.localize('PINGS.key.title'),
			hint: game.i18n.localize('PINGS.key.hint'),
			default: '',
			type: extraTypes.KeySelector
		});
		register('keyMove', {
			name: game.i18n.localize('PINGS.keyMove.title'),
			hint: game.i18n.localize('PINGS.keyMove.hint'),
			default: '',
			type: extraTypes.KeySelector
		});
		register('showName', {
			name: game.i18n.localize('PINGS.showName.title'),
			hint: game.i18n.localize('PINGS.showName.hint'),
			default: true,
			type: Boolean
		});
		register('image', {
			name: game.i18n.localize('PINGS.image.title'),
			hint: game.i18n.localize('PINGS.image.hint'),
			default: '',
			type: extraTypes.FilePickerImage
		});
		register('scale', {
			name: game.i18n.localize('PINGS.scale.title'),
			hint: game.i18n.localize('PINGS.scale.hint'),
			default: 1,
			type: Number
		});
		register('duration', {
			name: game.i18n.localize('PINGS.duration.title'),
			hint: game.i18n.localize('PINGS.duration.hint'),
			default: 6,
			type: Number
		});
		register('rotate', {
			name: game.i18n.localize('PINGS.rotate.title'),
			hint: game.i18n.localize('PINGS.rotate.hint'),
			default: true,
			type: Boolean
		});
		register('rotateSpeed', {
			name: game.i18n.localize('PINGS.rotateSpeed.title'),
			hint: game.i18n.localize('PINGS.rotateSpeed.hint'),
			default: 6,
			type: Number
		});
		register('sizeChange', {
			name: game.i18n.localize('PINGS.sizeChange.title'),
			hint: game.i18n.localize('PINGS.sizeChange.hint'),
			default: true,
			type: Boolean
		});
		register('sizeChangeAmount', {
			name: game.i18n.localize('PINGS.sizeChangeAmount.title'),
			hint: game.i18n.localize('PINGS.sizeChangeAmount.hint'),
			default: 0.125,
			type: Number
		});
		register('sizeChangeSpeed', {
			name: game.i18n.localize('PINGS.sizeChangeSpeed.title'),
			hint: game.i18n.localize('PINGS.sizeChangeSpeed.hint'),
			default: 3,
			type: Number
		});

	}

	function register(key, data) {
		const dataWithDefaults = {
			scope: 'client',
			type: String,
			config: true,
			...data
		};
		defineSetting(key, dataWithDefaults.type);
		game.settings.register('pings', key, dataWithDefaults);
	}

	function defineSetting(key, type) {
		const get = () => game.settings.get('pings', key);
		const set = (val) => game.settings.set('pings', key, val);
		let getset;
		if (type.parse && Object.values(window.AzzuriteTV.SettingsTypes).includes(type)) {
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
		Object.defineProperty(Settings, key, getset);
	}
})();
