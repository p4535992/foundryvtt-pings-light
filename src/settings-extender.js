/**
 * window.AzzuriteTV.SettingsTypes is guaranteed to be initialized on document.ready
 * window.AzzuriteTV.ExtendedSettingsConfig is guaranteed to be initialized after Hooks->ready
 */
(() =>{
	window.AzzuriteTV = window.AzzuriteTV || {};
	registerSettingsTypes();
	extendSettingsWindow();

	// Definitions

	function registerSettingsTypes() {
		if (window.AzzuriteTV.SettingsTypes) {
			return;
		}

		window.AzzuriteTV.SettingsTypes = createExtraInputTypes();
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

		return {
			MouseButtonSelector,
			KeySelector,
			...filePickers
		};
	}

	function extendSettingsWindow() {
		Hooks.once('ready', () => {
			if (window.AzzuriteTV.ExtendedSettingsConfig) {
				return;
			}

			window.AzzuriteTV.ExtendedSettingsConfig = ExtendedSettingsConfig;
			game.settings._sheet = new ExtendedSettingsConfig(game.settings.settings);
		});
	}

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
			let extraTypes = window.AzzuriteTV.SettingsTypes;
			// before super.activateListeners as FormApplication.activateListeners
			// initialises FilePickers
			extraTypes.FilePickerImage.addButtons($html);

			super.activateListeners($html);

			Object.entries(extraTypes).forEach(([name, type]) => {
				$html.find(`[data-dtype="${name}"`).on(type.EVENT_TYPE, type.eventHandler);
			});
		}
	}
})();
