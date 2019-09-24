(() => {
	window.AzzuriteTV = window.AzzuriteTV || {};
	const Settings = window.AzzuriteTV.PingsSettings = window.AzzuriteTV.PingsSettings || function(){};

	const extraTypes = createExtraInputTypes();

	Hooks.once('init', () => {
		registerPingsSettings();
	});
	Hooks.once('ready', () => {
		extendSettingsWindow(extraTypes);
	});

	function registerPingsSettings() {
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
		if (type.parse && Object.values(extraTypes).includes(type)) {
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

	function createExtraInputTypes() {
		const MODIFIERS = {
			ctrlKey: 'Ctrl + ',
			shiftKey: 'Shift + ',
			metaKey: 'Meta + ',
			altKey: 'Alt + '
		};
		function parseModifiers(val, keyProp) {
			return Object.entries(MODIFIERS).reduce((obj, [prop, val]) => {
				if (obj[keyProp].includes(val)) {
					obj[prop] = true;
					obj[keyProp] = obj[keyProp].replace(val, '');
				}
				return obj;
			}, {[keyProp]: val});
		}

		function formatModifiers(val) {
			return Object.entries(MODIFIERS)
				.reduce((modifier, [mod, str]) => {
					return modifier + (val[mod] ? str : '');
				}, '');
		}

		function MouseButtonSelector(val) {
			return val;
		}
		MouseButtonSelector.EVENT_TYPE = 'mousedown';
		MouseButtonSelector.MOUSE_BUTTONS = new Proxy({
			0: 'LeftClick',
			1: 'MiddleClick',
			2: 'RightClick'
		}, {
			get(obj, prop) {
				return prop in obj ? obj[prop] : 'Mouse' + ((+prop) + 1);
			}
		});
		MouseButtonSelector.eventHandler = (e) => {
			e = e.originalEvent || e;
			e.preventDefault();

			const $input = $(e.target);

			if (e.key === 'Escape') {
				$input.val('');
				return;
			}

			$input.val(MouseButtonSelector.format(e));
		};
		MouseButtonSelector.parse = (val) => {
			if (!val) return val;
			const modifiers = parseModifiers(val, 'button');
			if (/Mouse\d/.test(modifiers.button)) {
				modifiers.button = +modifiers.button[5];
			} else {
				modifiers.button = Object.entries(MouseButtonSelector.MOUSE_BUTTONS)
					.reduce((btn, [val, text]) => {
					return btn === text ? +val : btn;
				}, modifiers.button);
			}
			return modifiers;
		};
		MouseButtonSelector.format = (val) => {
			return formatModifiers(val) + MouseButtonSelector.MOUSE_BUTTONS[val.button];
		};

		function KeySelector(val) {
			return val;
		}
		KeySelector.LOCATIONS = {
			0: '',
			1: 'Left ',
			2: 'Right ',
			3: 'Numpad '
		};
		KeySelector.EVENT_TYPE = 'keydown';
		KeySelector.IGNORED_KEYS = ['Shift', 'Alt', 'Control', 'Meta', 'F5'];
		KeySelector.eventHandler = (e) => {
			e = e.originalEvent || e;

			if (KeySelector.IGNORED_KEYS.includes(e.key)) {
				return;
			}

			e.preventDefault();

			const $input = $(e.target);
			if (e.key === 'Escape') {
				$input.val('');
				return;
			}
			$input.val(KeySelector.format(e));
		};

		KeySelector.parse = (val) => {
			if (!val) return val;
			const withModifiers = parseModifiers(val, 'key');

			return Object.entries(KeySelector.LOCATIONS)
				.filter(entry => entry[1] !== '')
				.reduce((obj, [prop, val]) => {
					if (obj.key.includes(val)) {
						obj.location = prop;
						obj.key = obj.key.replace(val, '');
					}
					return obj;
				}, {
					...withModifiers,
					location: 0
				});
		};

		KeySelector.format = (val) => {
			return formatModifiers(val) + KeySelector.LOCATIONS[val.location] + val.key;
		};

		function FilePickerImage(val) {
			return val;
		}
		function FilePickerVideo(val) {
			return val;
		}
		function FilePickerImageVideo(val) {
			return val;
		}
		function FilePickerAudio(val) {
			return val;
		}
		const filePickers = {
			FilePickerImage,
			FilePickerVideo,
			FilePickerImageVideo,
			FilePickerAudio
		};
		Object.values(filePickers).forEach(FilePicker => {
			FilePicker.addButtons = ($html) => {
				const base = 'FilePicker';
				const $filePickers = $html.find(`[data-dtype^="${base}"]`);
				$filePickers.each((idx, input) => {
					const $input = $(input);
					const $formGroup = $input.parent();
					$formGroup.find('.hint').css('order', '100');
					const target = $input.attr('name');
					const type = $input.data('dtype').substring(base.length).toLowerCase();
					$input.after(`<button type=button class=file-picker data-type="${type}"`
						+ ` data-target="${target}" title="Browse Files" tabindex=-1>`
						+ `<i class="fas fa-file-import fa-fw"></i></button>`);
				});
			};
		});

		const extraTypes = {
			MouseButtonSelector,
			KeySelector,
			...filePickers
		};

		Object.entries(extraTypes).forEach(([name, type]) => {
			window.AzzuriteTV[name] = type;
		});

		return extraTypes;
	}


	function extendSettingsWindow(extraTypes) {

		class ExtendedSettingsConfig extends SettingsConfig {
			getData() {
				const data = super.getData();
				data.modules.flatMap(m => m.settings).forEach(setting => {
					const key = setting.module + '.' + setting.key;
					const type = game.settings.settings[key].type;
					if (typeof type === 'function') {
						setting.type = type.name;
					} else {
						setting.type = 'unknown'
					}
				});
				return data;
			}

			activateListeners($html) {
				// before super.activateListeners as FormApplication.activateListeners
				// initialises FilePickers
				extraTypes.FilePickerImage.addButtons($html);

				super.activateListeners($html);

				Object.entries(extraTypes).forEach(([name, type]) => {
					$html.find(`[data-dtype="${name}"`).on(type.EVENT_TYPE, type.eventHandler);
				});
			}
		}

		game.settings._sheet = new ExtendedSettingsConfig(game.settings.settings);
	}
})();
