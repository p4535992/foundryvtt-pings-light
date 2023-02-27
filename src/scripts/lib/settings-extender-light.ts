const MODIFIERS = {
	ctrlKey: "Ctrl + ",
	shiftKey: "Shift + ",
	metaKey: "Meta + ",
	altKey: "Alt + ",
};

function parseModifiers(val, keyProp) {
	return Object.entries(MODIFIERS).reduce(
		(obj, [prop, val]) => {
			if (obj[keyProp].includes(val)) {
				obj[prop] = true;
				obj[keyProp] = obj[keyProp].replace(val, "");
			} else {
				obj[prop] = false;
			}
			return obj;
		},
		{ [keyProp]: val }
	);
}

function formatModifiers(val) {
	return Object.entries(MODIFIERS).reduce((modifier, [mod, str]) => {
		return modifier + (val[mod] ? str : "");
	}, "");
}

function modifiersEqual(e, modifiers) {
	return Object.keys(MODIFIERS).reduce((modifiersCorrect, mod) => {
		return modifiersCorrect && e[mod] === modifiers[mod];
	}, true);
}

function eventIsForBinding(e, binding, keyProp) {
	// "e" may be a jQuery event, we want the original Javascript event though
	e = e.originalEvent || e;

	return modifiersEqual(e, binding) && e[keyProp] === binding[keyProp];
}

const IGNORED_KEYS = ["Shift", "Alt", "Control", "Meta", "F5"];

// ===============================================================

export function MouseButtonBinding(val) {
	return val;
}

MouseButtonBinding._MOUSE_BUTTONS = new Proxy(
	{
		0: "LeftClick",
		1: "MiddleClick",
		2: "RightClick",
	},
	{
		get(obj, prop: string) {
			return prop in obj ? obj[prop] : "Mouse" + ("" + prop + 1);
		},
	}
);
MouseButtonBinding._eventHandlers = {
	mousedown(e) {
		e = e.originalEvent || e;
		e.preventDefault();

		const $input = $(e.target);
		$input.focus();
		$input.val(MouseButtonBinding.format(e));
	},

	keydown(e) {
		e = e.originalEvent || e;
		if (IGNORED_KEYS.includes(e.key)) {
			return;
		}
		e.preventDefault();
		if (e.key === "Escape") {
			const $input = $(e.target);
			$input.val("");
		}
	},
};
MouseButtonBinding.parse = (val) => {
	if (!val) return val;
	const modifiers = <any>parseModifiers(val, "button");
	if (/Mouse\d/.test(modifiers.button)) {
		modifiers.button = +modifiers.button[5];
	} else {
		modifiers.button = Object.entries(MouseButtonBinding._MOUSE_BUTTONS).reduce((btn, [val, text]) => {
			return btn === text ? +val : btn;
		}, modifiers.button);
	}
	return modifiers;
};
MouseButtonBinding.format = (val) => {
	return formatModifiers(val) + MouseButtonBinding._MOUSE_BUTTONS[val.button];
};
MouseButtonBinding.eventIsForBinding = (event, button) => {
	return eventIsForBinding(event, button, "button");
};

// ===============================================================

export function KeyBinding(val) {
	return val;
}

KeyBinding._LOCATIONS = {
	0: "",
	1: "Left ",
	2: "Right ",
	3: "Numpad ",
};
KeyBinding._eventHandlers = {
	keydown(e) {
		e = e.originalEvent || e;

		if (IGNORED_KEYS.includes(e.key)) {
			return;
		}

		e.preventDefault();

		const $input = $(e.target);
		if (e.key === "Escape") {
			$input.val("");
			return;
		}
		$input.val(KeyBinding.format(e));
	},
};
KeyBinding.parse = (val) => {
	if (!val) return val;
	const withModifiers = parseModifiers(val, "key");

	return Object.entries(KeyBinding._LOCATIONS)
		.filter((entry) => entry[1] !== "")
		.reduce(
			(obj: any, [prop, val]) => {
				if (obj.key.includes(val)) {
					obj.location = prop;
					obj.key = obj.key.replace(val, "");
				}
				return obj;
			},
			{
				...withModifiers,
				location: 0,
			}
		);
};
KeyBinding.format = (val) => {
	return formatModifiers(val) + KeyBinding._LOCATIONS[val.location] + val.key;
};
KeyBinding.eventIsForBinding = (event, button) => {
	return eventIsForBinding(event, button, "key");
};
