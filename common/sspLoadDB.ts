import { db, connect } from "../server/mysql";

const loadPromise = new Promise<void>(async (resolve) => {
  await connect();
  await db.query("USE upvotr");
  resolve();
});

export default function sspLoadDB() {
  return loadPromise;
}
