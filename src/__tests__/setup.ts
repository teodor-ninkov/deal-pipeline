// Node 25+ ships its own global localStorage, which is undefined unless Node is given a file
// to keep it in. It hides the jsdom one, so put jsdom's storage back for the browser tests.
declare const jsdom: { window: Window } | undefined;

if (typeof jsdom !== "undefined") {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    Object.defineProperty(globalThis, name, { value: jsdom.window[name], configurable: true, writable: true });
  }
}
