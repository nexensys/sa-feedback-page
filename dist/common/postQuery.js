"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuery = exports.commentsQuery = exports.authorNameQuery = exports.commentsQueryFrom = exports.postsQueryFrom = void 0;
exports.postsQueryFrom = `FROM posts p
LEFT JOIN users u ON u.userId = p.author
LEFT JOIN votes v ON v.postId = p.postId`;
exports.commentsQueryFrom = `FROM comments c
LEFT JOIN users u ON u.userId = c.author`;
exports.authorNameQuery = "IF(u.anonymous = TRUE, 'Anonymous User', COALESCE(u.username, '<Deleted user>')) AS authorName";
exports.commentsQuery = `SELECT
  c.content,
  c.posted,
  ${exports.authorNameQuery},
  IF(u.anonymous, '0', c.author) AS authorId,
  c.commentId,
  c.repliesTo,
  (SELECT IF(
    COUNT(r.emoji) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(
      JSON_OBJECT(
        "type", r.emoji,
        "user", r.userId
      )
    )
  ) FROM reactions r
  WHERE r.targetIsPost = FALSE AND r.target = c.commentId) AS reactions
${exports.commentsQueryFrom}
WHERE c.postId = ?`;
const postQuery = `SELECT
  p.title,
  p.content,
  p.posted,
  p.postType,
  p.postId,
  ${exports.authorNameQuery},
  IF(u.anonymous, '0', p.author) AS authorId,
  SUM(
    IF(ISNULL(v.vote), 0, IF(v.vote, 1, -1))
  ) AS votes,
  (SELECT IF(
    COUNT(r.emoji) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(
      JSON_OBJECT(
        "type", r.emoji,
        "user", r.userId
      )
    )
  ) FROM reactions r
  WHERE r.targetIsPost = TRUE AND r.target = p.postId) AS reactions,
  (SELECT IF(
    COUNT(t.tagId) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(t.tagId)
  ) FROM tags t
  INNER JOIN tagDefinitions tDef USING(tagId)
  WHERE t.postId = p.postId AND NOT COALESCE(tDef.private, FALSE)) AS tags
${exports.postsQueryFrom}
WHERE p.postId = ?
GROUP BY p.postId`;
exports.default = postQuery;
function generateQuery(columns, tags, privateTags, authorName, votes, reactions, queryFrom = exports.postsQueryFrom, filter = "", noWhere = true) {
    return `SELECT ${columns.join(", ")}
  ${authorName ? `, ${exports.authorNameQuery}` : ""}
  ${votes ? ", SUM(IF(ISNULL(v.vote), 0, IF(v.vote, 1, -1))) AS votes" : ""}
  ${reactions
        ? `, (SELECT IF(
    COUNT(r.emoji) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(
      JSON_OBJECT(
        "type", r.emoji,
        "user", r.userId
      )
    )
  ) FROM reactions r
  WHERE r.targetIsPost = TRUE AND r.target = p.postId) AS reactions`
        : ""}
  ${tags
        ? `, (SELECT IF(
    COUNT(t.tagId) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(t.tagId)
  ) FROM tags t
  ${privateTags
            ? "WHERE t.postId = p.postId"
            : `INNER JOIN tagDefinitions tDef USING(tagId)
  WHERE t.postId = p.postId AND NOT COALESCE(tDef.private, FALSE)`}) AS tags`
        : ""}
  ${queryFrom}
  ${noWhere ? "" : "WHERE"} ${filter}`;
}
exports.generateQuery = generateQuery;
//# sourceMappingURL=postQuery.js.map