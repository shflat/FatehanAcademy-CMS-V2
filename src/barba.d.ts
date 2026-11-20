declare module '@barba/core' {
  const barba: {
    version?: string;
    init?: (options?: Record<string, unknown>) => void;
    [key: string]: unknown;
  };
  export default barba;
}

declare module 'muuri' {
  export default class Muuri {
    constructor(
      element: HTMLElement | string,
      options?: {
        items?: string | HTMLElement[];
        dragEnabled?: boolean;
        layoutOnInit?: boolean;
        layoutDuration?: number;
        layoutEasing?: string;
        dragSort?: boolean;
        [key: string]: unknown;
      }
    );
    refreshItems(): this;
    layout(instant?: boolean): this;
    destroy(removeElements?: boolean): this;
  }
}
