import style from "@styles/Footer.module.css";

const Footer: React.FC = () => (
  <footer className={style.container}>
    <div className={style.content}>
      <p>
        &copy; 2023{" "}
        <a
          href="https://github.com/ErrorGamer2000"
          target="_blank"
          rel="noreferrer"
        >
          ErrorGamer2000
        </a>
      </p>
    </div>
  </footer>
);

export default Footer;
