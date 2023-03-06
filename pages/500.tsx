import style from "@styles/404.module.css";

const PageNotFound: React.FC = () => (
  <section className={style.wrapper}>
    <div className={style.container}>
      <p className={style.code}>500</p>
      <p className={style.text}>
        Oops! We seem to be having some trouble, we&apos;re working on fixing
        that.
      </p>
    </div>
  </section>
);

export default PageNotFound;
