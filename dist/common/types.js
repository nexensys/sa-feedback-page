"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEvent = exports.getPostBasePathByType = exports.PostType = void 0;
var PostType;
(function (PostType) {
    PostType[PostType["Suggestion"] = 0] = "Suggestion";
    PostType[PostType["BugReport"] = 1] = "BugReport";
    PostType[PostType["Question"] = 2] = "Question";
    PostType[PostType["Search"] = 3] = "Search";
})(PostType = exports.PostType || (exports.PostType = {}));
const getPostBasePathByType = (type) => type === PostType.Suggestion
    ? "suggestions"
    : type === PostType.BugReport
        ? "bugs"
        : "questions";
exports.getPostBasePathByType = getPostBasePathByType;
var WebhookEvent;
(function (WebhookEvent) {
    WebhookEvent["TagAdd"] = "TagAdd";
    WebhookEvent["TagRemove"] = "TagRemove";
    WebhookEvent["PostCreate"] = "PostCreate";
    WebhookEvent["PostEdit"] = "PostEdit";
    WebhookEvent["PostDelete"] = "PostDelete";
    WebhookEvent["PostAnswer"] = "PostAnswer";
    WebhookEvent["PostPublicized"] = "PostPublicized";
    WebhookEvent["PostHidden"] = "PostHidden";
    WebhookEvent["CommentCreate"] = "CommentCreate";
    WebhookEvent["CommentEdit"] = "CommentEdit";
    WebhookEvent["CommentDelete"] = "CommentDelete";
})(WebhookEvent = exports.WebhookEvent || (exports.WebhookEvent = {}));
//# sourceMappingURL=types.js.map