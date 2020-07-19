(() => {
	window.Azzu = window.Azzu || {};

	const KEYS = {
		PINGS: 'pings',
		MINIMUM_PERMISSION: 'minMovePermission',
		LAST_VERSION: 'lastVersion'
	};

	const MIGRATION = {
		UNNECESSARY: 0,
		FAILED: 1,
		SUCCESS: 2
	};

	const migrations = [
		{
			version: '1.2.2',
			func: async (lastVersion) => {
				if (lastVersion) {
					return MIGRATION.UNNECESSARY;
				}

				if (game.settings.get(KEYS.PINGS, KEYS.MINIMUM_PERMISSION) === 0) {
					await game.settings.set(KEYS.PINGS, KEYS.MINIMUM_PERMISSION, 1);
				}

				await game.settings.set(KEYS.PINGS, KEYS.LAST_VERSION, '1.2.2');
				return MIGRATION.SUCCESS;
			}
		}
	];

	async function migrate() {
		try {
			game.settings.register(KEYS.PINGS, 'lastVersion', {
				config: false,
				scope: 'client',
				type: String,
				default: ''
			});
			let finalResult;
			let lastVersion = game.settings.get(KEYS.PINGS, KEYS.LAST_VERSION);
			for (migration of migrations) {
				const migrationResult = await migration.func(lastVersion);
				if (migrationResult === MIGRATION.FAILED) {
					finalResult = migrationResult;
					break;
				} else if (finalResult !== MIGRATION.SUCCESS) {
					finalResult = migrationResult;
				}
				lastVersion = migration.version;
			}
			return finalResult === MIGRATION.SUCCESS ? lastVersion : finalResult;
		} catch (e) {
			console.error('Pings migration failed:', e);
			return MIGRATION.FAILED;
		}
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
			name: game.i18n.localize('PINGS.settings.minMovePermission.title'),
			hint: game.i18n.localize('PINGS.settings.minMovePermission.hint'),
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
			name: game.i18n.localize('PINGS.settings.mouseButton.title'),
			hint: game.i18n.localize('PINGS.settings.mouseButton.hint'),
			default: 'LeftClick',
			type: extraTypes.MouseButtonBinding
		});
		if (game.user.hasRole(minMovePermission)) {
			register('mouseButtonMove', {
				name: game.i18n.localize('PINGS.settings.mouseButtonMove.title'),
				hint: game.i18n.localize('PINGS.settings.mouseButtonMove.hint'),
				default: 'Shift + LeftClick',
				type: extraTypes.MouseButtonBinding
			});
		}
		register('mouseButtonDuration', {
			name: game.i18n.localize('PINGS.settings.mouseButtonDuration.title'),
			hint: game.i18n.localize('PINGS.settings.mouseButtonDuration.hint'),
			default: 350,
			type: Number
		});
		register('key', {
			name: game.i18n.localize('PINGS.settings.key.title'),
			hint: game.i18n.localize('PINGS.settings.key.hint'),
			default: '',
			type: extraTypes.KeyBinding
		});
		if (game.user.hasRole(minMovePermission)) {
			register('keyMove', {
				name: game.i18n.localize('PINGS.settings.keyMove.title'),
				hint: game.i18n.localize('PINGS.settings.keyMove.hint'),
				default: '',
				type: extraTypes.KeyBinding
			});
		}
		register('showName', {
			name: game.i18n.localize('PINGS.settings.showName.title'),
			hint: game.i18n.localize('PINGS.settings.showName.hint'),
			default: true,
			type: Boolean
		});
		register('image', {
			name: game.i18n.localize('PINGS.settings.image.title'),
			hint: game.i18n.localize('PINGS.settings.image.hint'),
			default: '',
			type: extraTypes.FilePickerImage
		});
		register('scale', {
			name: game.i18n.localize('PINGS.settings.scale.title'),
			hint: game.i18n.localize('PINGS.settings.scale.hint'),
			default: 1,
			type: Number
		});
		register('duration', {
			name: game.i18n.localize('PINGS.settings.duration.title'),
			hint: game.i18n.localize('PINGS.settings.duration.hint'),
			default: 6,
			type: Number
		});
		register('rotate', {
			name: game.i18n.localize('PINGS.settings.rotate.title'),
			hint: game.i18n.localize('PINGS.settings.rotate.hint'),
			default: true,
			type: Boolean
		});
		register('rotateSpeed', {
			name: game.i18n.localize('PINGS.settings.rotateSpeed.title'),
			hint: game.i18n.localize('PINGS.settings.rotateSpeed.hint'),
			default: 6,
			type: Number
		});
		register('sizeChange', {
			name: game.i18n.localize('PINGS.settings.sizeChange.title'),
			hint: game.i18n.localize('PINGS.settings.sizeChange.hint'),
			default: true,
			type: Boolean
		});
		register('sizeChangeAmount', {
			name: game.i18n.localize('PINGS.settings.sizeChangeAmount.title'),
			hint: game.i18n.localize('PINGS.settings.sizeChangeAmount.hint'),
			default: 0.125,
			type: Number
		});
		register('sizeChangeSpeed', {
			name: game.i18n.localize('PINGS.settings.sizeChangeSpeed.title'),
			hint: game.i18n.localize('PINGS.settings.sizeChangeSpeed.hint'),
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
