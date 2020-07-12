(() => {
	window.Azzu = window.Azzu || {};

	const KEYS = {
		PINGS: 'pings',
		MINIMUM_PERMISSION: 'minMovePermission',
		LAST_VERSION: 'lastVersion'
	};

	const MIGRATION = {
		UNNECESSARY: 0,
		FAILED: 1
	};

	async function migrate() {
		let result = MIGRATION.UNNECESSARY;
		game.settings.register(KEYS.PINGS, 'lastVersion', {
			config: false,
			scope: 'client',
			type: String,
			default: ''
		});
		let lastVersion = game.settings.get(KEYS.PINGS, KEYS.LAST_VERSION);
		if (!lastVersion) {
			if (game.settings.get(KEYS.PINGS, KEYS.MINIMUM_PERMISSION) === 0) {
				await game.settings.set(KEYS.PINGS, KEYS.MINIMUM_PERMISSION,  1);
			}

			registerPingsSettings();

			await game.settings.set(KEYS.PINGS, KEYS.LAST_VERSION, '1.2.2');
			result = lastVersion = '1.2.2';
		}
		return lastVersion === '1.2.2' ? result : MIGRATION.FAILED;
	}

	function PingsSettings() {}

	Hooks.once('ready', async () => {
		registerPingsSettings();
		const migrationResult = await migrate();
		if (migrationResult === MIGRATION.FAILED) {
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
		Hooks.call('pingsSettingsReady', PingsSettings);
	});

	// Definitions

	function registerMovePermissions() {
		const choices = Object.entries(CONST.USER_ROLES)
			.filter(([key, val]) => val !== 0)
			.reduce((choices, [permission, val]) => {
				choices[val] = permission;
				return choices;
			}, {});
		register(KEYS.MINIMUM_PERMISSION, {
			name: game.i18n.localize('PINGS.minMovePermission.title'),
			hint: game.i18n.localize('PINGS.minMovePermission.hint'),
			default: 1,
			isSelect: true,
			choices: choices,
			type: Number,
			scope: "world"
		});
		return PingsSettings[KEYS.MINIMUM_PERMISSION];
	}

	function registerPingsSettings() {
		const extraTypes = window.Azzu.SettingsTypes;

		const minMovePermission = registerMovePermissions();

		register('mouseButton', {
			name: game.i18n.localize('PINGS.mouseButton.title'),
			hint: game.i18n.localize('PINGS.mouseButton.hint'),
			default: 'LeftClick',
			type: extraTypes.MouseButtonBinding
		});
		if (game.user.hasRole(minMovePermission)) {
			register('mouseButtonMove', {
				name: game.i18n.localize('PINGS.mouseButtonMove.title'),
				hint: game.i18n.localize('PINGS.mouseButtonMove.hint'),
				default: 'Shift + LeftClick',
				type: extraTypes.MouseButtonBinding
			});
		}
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
			type: extraTypes.KeyBinding
		});
		if (game.user.hasRole(minMovePermission)) {
			register('keyMove', {
				name: game.i18n.localize('PINGS.keyMove.title'),
				hint: game.i18n.localize('PINGS.keyMove.hint'),
				default: '',
				type: extraTypes.KeyBinding
			});
		}
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
		game.settings.register(KEYS.PINGS, key, dataWithDefaults);
	}

	function defineSetting(key, type) {
		const get = () => game.settings.get(KEYS.PINGS, key);
		const set = (val) => game.settings.set(KEYS.PINGS, key, val);
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
		if (!PingsSettings.hasOwnProperty(key)) Object.defineProperty(PingsSettings, key, getset);
	}
})();
