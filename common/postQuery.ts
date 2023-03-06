export const postsQueryFrom = `FROM posts p
LEFT JOIN users u ON u.userId = p.author
LEFT JOIN votes v ON v.postId = p.postId`;

export const commentsQueryFrom = `FROM comments c
LEFT JOIN users u ON u.userId = c.author`;

export const authorNameQuery =
  "IF(u.anonymous = TRUE, 'Anonymous User', COALESCE(u.username, '<Deleted user>')) AS authorName";

export const commentsQuery = `SELECT
  c.content,
  c.posted,
  ${authorNameQuery},
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
${commentsQueryFrom}
WHERE c.postId = ?`;

const postQuery = `SELECT
  p.title,
  p.content,
  p.posted,
  p.postType,
  p.postId,
  ${authorNameQuery},
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
${postsQueryFrom}
WHERE p.postId = ?
GROUP BY p.postId`;

export default postQuery;

export function generateQuery(
  columns: string[],
  tags: boolean,
  privateTags: boolean,
  authorName: boolean,
  votes: boolean,
  reactions: boolean,
  queryFrom: string = postsQueryFrom,
  filter: string = "",
  noWhere = true
) {
  return `SELECT ${columns.join(", ")}
  ${authorName ? `, ${authorNameQuery}` : ""}
  ${votes ? ", SUM(IF(ISNULL(v.vote), 0, IF(v.vote, 1, -1))) AS votes" : ""}
  ${
    reactions
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
      : ""
  }
  ${
    tags
      ? `, (SELECT IF(
    COUNT(t.tagId) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(t.tagId)
  ) FROM tags t
  ${
    privateTags
      ? "WHERE t.postId = p.postId"
      : `INNER JOIN tagDefinitions tDef USING(tagId)
  WHERE t.postId = p.postId AND NOT COALESCE(tDef.private, FALSE)`
  }) AS tags`
      : ""
  }
  ${queryFrom}
  ${noWhere ? "" : "WHERE"} ${filter}`;
}
