declare module 'frog' {
  export interface FrogConfig {
    basePath?: string;
    dev?: boolean;
    assetsPath?: string;
    title?: string;
    hub?: any;
  }

  export interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    value?: string;
  }

  export interface TextInputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
  }

  export interface FrameContext {
    buttonValue?: string;
    inputText?: string;
    status?: string;
    res: (options: {
      image: React.ReactNode;
      intents: React.ReactNode[];
    }) => any;
  }

  export class Frog {
    constructor(config?: FrogConfig);
    frame(path: string, handler: (c: FrameContext) => any): void;
  }

  export function Button(props: ButtonProps): JSX.Element;
  export namespace Button {
    export function Reset(props: ButtonProps): JSX.Element;
  }
  export function TextInput(props: TextInputProps): JSX.Element;
}

declare module 'frog/dev' {
  export function devtools(app: any, options?: { assetsPath?: string; serveStatic?: any }): void;
}

declare module 'frog/next' {
  export function handle(app: any): any;
}

declare module 'frog/serve-static' {
  export function serveStatic(): any;
} 