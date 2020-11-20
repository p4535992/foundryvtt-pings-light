import createPingsGui from './pings-gui.js';

describe(`pings-gui`, () => {
	jasmine.clock().install();

	const options = {
		mouseButton: {
			button: 0
		},
		mouseButtonMove: {
			button: 1
		},
		mouseButtonDuration: 1,
		key: {
			key: `p`
		}
	};

	function collectEventCallbacks(collectIn) {
		return (e, callback) => {
			if (!collectIn[e]) collectIn[e] = [];
			collectIn[e].push(callback);
		}
	}

	function triggerCallback(callbacks, event, ...args) {
		callbacks[event].forEach((cb) => {
			cb(...args);
		});
	}

	function createMockedGui(createPing = () => {}) {
		const windowListeners = {};
		const window = {
			addEventListener: collectEventCallbacks(windowListeners),
			Azzu: {
				SettingsTypes: {
					MouseButtonBinding: {
						eventIsForBinding(e, option) {
							return e.button === option.button;
						}
					},
					KeyBinding: {
						eventIsForBinding(e, option) {
							return e.key === option.key;
						}
					}
				}
			}
		};
		const stageListeners = {};
		const stage = {
			on: collectEventCallbacks(stageListeners),
			worldTransform: {tx: 0, ty: 0},
			scale: {x: 1, y: 1},
			addChild: jasmine.createSpy(`stage.addChild`),
			children: []
		};
		const canvasMousePosition = {x: 13, y: 37};
		const canvas = {
			stage: stage,
			app: {renderer: {plugins: {interaction: {mouse: {global: canvasMousePosition}}}}},
			animatePan: jasmine.createSpy(`canvas.animatePan`)
		};
		const mockUser = {
			_id: 0,
			color: '',
			hasRole: jasmine.createSpy(`user.hasRole`)
		};
		const game = {
			user: mockUser,
			users: {
				get() { return mockUser; }
			}
		};
		const hooks = {
			on() {}
		};

		return {
			window,
			windowListeners,
			canvas,
			canvasMousePosition,
			stage,
			stageListeners,
			game,
			hooks,
			gui: createPingsGui(window, canvas, game, hooks, options, createPing, () => {})
		};
	}

	it(`should display a ping when canvas is clicked`, () => {
		const mockPing = `ping`;
		const {
			stage: {addChild},
			stageListeners,
			windowListeners
		} = createMockedGui(() => mockPing);

		triggerCallback(stageListeners, `mouseover`);
		triggerCallback(windowListeners, `mousedown`, options.mouseButton);

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(addChild).toHaveBeenCalledWith(mockPing);
	});

	it(`should cancel the ping if the mouse button is not held long enough`, () => {
		const {
			stage: {addChild},
			stageListeners,
			windowListeners
		} = createMockedGui();

		triggerCallback(stageListeners, `mouseover`);
		triggerCallback(windowListeners, `mousedown`, options.mouseButton);
		triggerCallback(windowListeners, `mouseup`, options.mouseButton);

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(addChild).not.toHaveBeenCalled();
	});

	it(`should not ping if the mouse is not on the canvas`, () => {
		const {
			stage: {addChild},
			windowListeners,
		} = createMockedGui();

		triggerCallback(windowListeners, `mousedown`, options.mouseButton);

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(addChild).not.toHaveBeenCalled();
	});

	it(`should not ping if the mouse is not on the canvas`, () => {
		const {
			stage: {addChild},
			windowListeners,
		} = createMockedGui();

		triggerCallback(windowListeners, `mousedown`, options.mouseButton);

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(addChild).not.toHaveBeenCalled();
	});

	it(`should not ping if the wrong mouse button was used`, () => {
		const {
			stage: {addChild},
			stageListeners,
			windowListeners
		} = createMockedGui();

		triggerCallback(stageListeners, `mouseover`);
		triggerCallback(windowListeners, `mousedown`, {button: `wrong`});

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(addChild).not.toHaveBeenCalled();
	});

	it(`should ping on keypress`, () => {
		const mockPing = `ping`;
		const {
			stage: {addChild},
			stageListeners,
			windowListeners
		} = createMockedGui(() => mockPing);

		triggerCallback(stageListeners, `mouseover`);
		triggerCallback(windowListeners, `keydown`, options.key);

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(addChild).toHaveBeenCalledWith(mockPing);
	});

	it(`should move when the move mouse bind is pressed`, () => {
		const createPing = (pos) => {
			return {...pos};
		};
		const {
			canvas: {animatePan},
			game: {user: {hasRole}},
			canvasMousePosition,
			stageListeners,
			windowListeners
		} = createMockedGui(createPing);

		hasRole.and.returnValue(true);

		triggerCallback(stageListeners, `mouseover`);
		triggerCallback(windowListeners, `mousedown`, options.mouseButtonMove);

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(animatePan).toHaveBeenCalledWith(canvasMousePosition);
	});

	it(`should not move when the user is lacking permission`, () => {
		const {
			canvas: {animatePan},
			game: {user: {hasRole}},
			stageListeners,
			windowListeners
		} = createMockedGui();

		hasRole.and.returnValue(false);

		triggerCallback(stageListeners, `mouseover`);
		triggerCallback(windowListeners, `mousedown`, options.mouseButtonMove);

		jasmine.clock().tick(options.mouseButtonDuration + 1);

		expect(animatePan).not.toHaveBeenCalled();
	});
});
