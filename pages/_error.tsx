import style from "@styles/404.module.css";

const Error = Object.assign(
  (({ statusCode }) => (
    <section className={style.wrapper}>
      <div className={style.container}>
        <p className={style.code}>{statusCode}</p>
        <p className={style.text}>Oops! Something broke...</p>
      </div>
    </section>
  )) as React.FC<{ statusCode: number }>,
  {
    getInitialProps: ({ res, err }: { res: any; err: any }) => {
      const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
      return { statusCode };
    }
  }
);

export default Error;
