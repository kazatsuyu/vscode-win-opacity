/**
 * Navite calls all in one file, in C style
 *
 * Some parts were taken from:
 * @source https://github.com/drywolf/code-solution-manager/blob/0.0.1/extension-ui/browser.js
 */

const ref = require('ref')
const ffi = require('ffi')

const voidPtr = ref.refType(ref.types["void"])
const stringPtr = ref.refType(ref.types.CString)

const GWL_EXSTYLE = -20;
const WS_EX_LAYERED = 0x80000;
const LWA_ALPHA = 0x2;

const VSCODE_WINDOW_SUFFIX = ' Visual Studio Code';
const VSCODE_INSIDERS_WINDOW_SUFFIX = ' Visual Studio Code - Insiders';

// Load all user32 functions we need
// Note: The A suffix indicates we're using ASCII for texts
var user32 = ffi.Library('user32', {
	EnumWindows: ['bool', [voidPtr, 'int32']],
	GetWindowTextA: ['long', ['long', stringPtr, 'long']],
	GetWindowLongA: ['long', ['long', 'int32']],
	SetWindowLongA: ['uint32', ['long', 'int32', 'long']],
	SetLayeredWindowAttributes: ['bool', ['long', 'uint32', 'byte', 'uint32']]
})

/**
 * Checks if input string ends with specified suffix
 * @param {string} input
 * @param {string} suffix
 * @return {boolean} does input ends with suffix
 */
function endsWith (str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// Context variable used to keep track of windows found in callback
var windows = [];
// This callback is called when searching throught all windows
var windowProc = ffi.Callback('bool', ['long', 'int32'], function (hwnd) {
	// Load window title
	var buf = new Buffer(255)
	user32.GetWindowTextA(hwnd, buf, 255)
	var window_name = ref.readCString(buf, 0)

	// Check if it's visual studio window
	if (!window_name || !window_name.length || !(endsWith(window_name, VSCODE_WINDOW_SUFFIX) || endsWith(window_name, VSCODE_INSIDERS_WINDOW_SUFFIX))) {
			return true
	}

	// Save to result array
	windows.push(hwnd)

	return true
})

/**
 * Returns list of windows handles of Code windows.
 * @return {number[]} handles of code windows
 */
exports.getCodeWindows = function () {
	windows = []
	user32.EnumWindows(windowProc, 0)
	return windows
}

/**
 * Sets opacity of specified window.
 * @param {number} hwd window handle
 * @param {number} opacity window opacity, should be in 0 - 255 range
 * @return {boolean} success of operation
 */
exports.setWindowOpacity = function (hwd, opacity) {
	if (typeof opacity !== 'number' || opacity < 0 || opacity > 255) {
		throw new Error('Invalid opacity parameter')
	}

	opacity = opacity | 0

	var windowLong = user32.GetWindowLongA(hwd, GWL_EXSTYLE)
	user32.SetWindowLongA(hwd, GWL_EXSTYLE, windowLong | WS_EX_LAYERED)
	return user32.SetLayeredWindowAttributes(hwd, 0, opacity, LWA_ALPHA)
}