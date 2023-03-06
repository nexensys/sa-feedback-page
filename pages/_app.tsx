import { Provider } from "react-redux";
import "@styles/globals.css";
import style from "@styles/App.module.css";
import type { AppProps } from "next/app";
import { wrapper } from "../redux/store";
import { NavBar } from "@components/NavBar";
import { Sora } from "@next/font/google";
import "@styles/prism-theme.css";
import "prismjs/plugins/line-highlight/prism-line-highlight.css";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";
import "prismjs/plugins/toolbar/prism-toolbar.css";
import "prismjs/plugins/autolinker/prism-autolinker.css";
import PostsContainer from "@components/PostsContainer";
import fetcher from "@common/sessionFetcher";
import useSWR from "swr";
import { SessionContext } from "../components/Account";
import ErrorBoundary from "../components/ErrorBoundary";

const sora = Sora({ subsets: ["latin"] });

export default function App({ Component, ...rest }: AppProps) {
  const { data } = useSWR("/sessions/session", fetcher);
  const { store, props } = wrapper.useWrappedStore(rest);
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SessionContext.Provider value={data || null}>
          <div className={`${style.wrapper} ${sora.className}`}>
            <NavBar />
            <main className={style.pagewrapper}>
              <PostsContainer>
                <Component {...props.pageProps} />
              </PostsContainer>
            </main>
            <div id="app-modal" />
          </div>
        </SessionContext.Provider>
      </Provider>
    </ErrorBoundary>
  );
}
