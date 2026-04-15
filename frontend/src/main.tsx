
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { toApiUrl } from "./app/config/runtime";
  import "./styles/index.css";

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      return originalFetch(toApiUrl(input), init);
    }

    if (input instanceof URL) {
      const asString = input.toString();
      return originalFetch(asString.startsWith(window.location.origin) ? toApiUrl(`${input.pathname}${input.search}${input.hash}`) : asString, init);
    }

    if (input instanceof Request) {
      const requestUrl = input.url;
      if (requestUrl.startsWith(window.location.origin)) {
        const parsed = new URL(requestUrl);
        return originalFetch(new Request(toApiUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`), input), init);
      }
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;

  createRoot(document.getElementById("root")!).render(<App />);
  