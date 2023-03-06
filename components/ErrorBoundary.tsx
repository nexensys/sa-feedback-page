import React from "react";
import style from "@styles/ErrorBoundary.module.css";
import Modal from "./Modal";
import { buttonProps } from "../common/util";

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  {
    hasError: boolean;
    error?: Error;
  }
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Modal visible focusTrap>
          <h1
            style={{
              alignSelf: "center"
            }}
          >
            We encountered an error
          </h1>
          <p className={style.error}>{this.state.error!.message}</p>
          <button
            className={style.button}
            {...buttonProps(() => this.setState({ hasError: false }))}
          >
            Okay
          </button>
        </Modal>
      );
    }

    return this.props.children;
  }
}
