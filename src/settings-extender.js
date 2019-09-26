/**
 * window.Azzu.SettingsTypes is guaranteed to be initialized on document.ready
 * window.Azzu.ExtendedSettingsConfig is guaranteed to be initialized after Hooks->ready
 */
(() =>{
	window.Azzu = window.Azzu || {};
	registerSettingsTypes();
	extendSettingsWindow();

	// Definitions

	function registerSettingsTypes() {
		if (window.Azzu.SettingsTypes) {
			return;
		}

		window.Azzu.SettingsTypes = createExtraInputTypes();
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
				} else {
					obj[prop] = false;
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

		function modifiersEqual(e, modifiers) {
			return Object.keys(MODIFIERS).reduce((modifiersCorrect, mod) => {
				return modifiersCorrect && (e[mod] === modifiers[mod]);
			}, true);
		}

		function eventIsForBinding(e, binding, keyProp) {
			// "e" may be a jQuery event, we want the original Javascript event though
			e = e.originalEvent || e;

			return modifiersEqual(e, binding) && e[keyProp] === binding[keyProp];
		}

		function MouseButtonBinding(val) {
			return val;
		}
		MouseButtonBinding._EVENT_TYPE = 'mousedown';
		MouseButtonBinding._MOUSE_BUTTONS = new Proxy({
			0: 'LeftClick',
			1: 'MiddleClick',
			2: 'RightClick'
		}, {
			get(obj, prop) {
				return prop in obj ? obj[prop] : 'Mouse' + ((+prop) + 1);
			}
		});
		MouseButtonBinding._eventHandler = (e) => {
			e = e.originalEvent || e;
			e.preventDefault();

			const $input = $(e.target);

			if (e.key === 'Escape') {
				$input.val('');
				return;
			}

			$input.val(MouseButtonBinding.format(e));
		};
		MouseButtonBinding.parse = (val) => {
			if (!val) return val;
			const modifiers = parseModifiers(val, 'button');
			if (/Mouse\d/.test(modifiers.button)) {
				modifiers.button = +modifiers.button[5];
			} else {
				modifiers.button = Object.entries(MouseButtonBinding._MOUSE_BUTTONS)
					.reduce((btn, [val, text]) => {
						return btn === text ? +val : btn;
					}, modifiers.button);
			}
			return modifiers;
		};
		MouseButtonBinding.format = (val) => {
			return formatModifiers(val) + MouseButtonBinding._MOUSE_BUTTONS[val.button];
		};
		MouseButtonBinding.eventIsForBinding = (event, button) => {
			return eventIsForBinding(event, button, 'button');
		};

		function KeyBinding(val) {
			return val;
		}
		KeyBinding._LOCATIONS = {
			0: '',
			1: 'Left ',
			2: 'Right ',
			3: 'Numpad '
		};
		KeyBinding._EVENT_TYPE = 'keydown';
		KeyBinding._IGNORED_KEYS = ['Shift', 'Alt', 'Control', 'Meta', 'F5'];
		KeyBinding._eventHandler = (e) => {
			e = e.originalEvent || e;

			if (KeyBinding._IGNORED_KEYS.includes(e.key)) {
				return;
			}

			e.preventDefault();

			const $input = $(e.target);
			if (e.key === 'Escape') {
				$input.val('');
				return;
			}
			$input.val(KeyBinding.format(e));
		};
		KeyBinding.parse = (val) => {
			if (!val) return val;
			const withModifiers = parseModifiers(val, 'key');

			return Object.entries(KeyBinding._LOCATIONS)
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
		KeyBinding.format = (val) => {
			return formatModifiers(val) + KeyBinding._LOCATIONS[val.location] + val.key;
		};
		KeyBinding.eventIsForBinding = (event, button) => {
			return eventIsForBinding(event, button, 'key');
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
			FilePicker.parse = (val) => val;
			FilePicker.format = (val) => val;
			FilePicker._addButtons = ($html) => {
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
			MouseButtonBinding,
			KeyBinding,
			...filePickers
		};
	}

	function extendSettingsWindow() {
		Hooks.once('ready', () => {
			if (window.Azzu.ExtendedSettingsConfig) {
				return;
			}

			window.Azzu.ExtendedSettingsConfig = ExtendedSettingsConfig;
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
			let extraTypes = window.Azzu.SettingsTypes;
			// before super.activateListeners as FormApplication.activateListeners
			// initialises FilePickers
			extraTypes.FilePickerImage._addButtons($html);

			super.activateListeners($html);

			Object.entries(extraTypes).forEach(([name, type]) => {
				$html.find(`[data-dtype="${name}"`).on(type._EVENT_TYPE, type._eventHandler);
			});
		}
	}
})();
