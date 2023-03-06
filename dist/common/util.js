"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buttonProps = exports.omit = void 0;
function omit(obj, k) {
    return Object.fromEntries(Object.entries(obj).filter((e) => !k.includes(e[0])));
}
exports.omit = omit;
function buttonProps(listener) {
    return {
        tabIndex: 0,
        role: "button",
        onClick: listener,
        onKeyPress: (e) => {
            if (e.key.toLowerCase() !== "enter")
                return;
            listener(e);
        }
    };
}
exports.buttonProps = buttonProps;
//# sourceMappingURL=util.js.map