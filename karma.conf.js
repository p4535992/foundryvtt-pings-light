module.exports = function(config) {
	config.set({
		frameworks: [`jasmine`],
		files: [
			{pattern: `src/**/*.test.js`, type: `module`},
			{pattern: `src/**/*.js`, included: false, type: `module`}
		]
	});
};
