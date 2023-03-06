import style from "@styles/404.module.css";

const PageNotFound: React.FC = () => (
  <section className={style.wrapper}>
    <div className={style.container}>
      <p className={style.code}>404</p>
      <p className={style.text}>We couldn&apos;t find that page...</p>
    </div>
  </section>
);

export default PageNotFound;
