import type { ParsedUrlQuery, ParsedUrlQueryInput } from "querystring";
import type { UrlWithParsedQuery } from "url";

interface UriObj extends Omit<UrlWithParsedQuery, "query"> {
  query: ParsedUrlQuery | null;
}

interface Header {
  __headerBranding: "header";
  name: string;
  value: string;
}

interface Cookie {
  __cookieBranding: "cookie";
  name: string;
  value: string;
}

interface Param {
  name: string;
  value: string;
  fileName: string;
  contentType: string;
}

export interface Request {
  url: string;
  fullUrl: string;
  queryString: string[];
  headers: Header[];
  cookies: Cookie[];
  httpVersion: string;
  uriObj: UriObj;
  queryObj: Record<string, string>;
  headersObj: Record<string, string>;
  cookiesObj: Record<string, string>;
  allHeaders: Record<string, string>;
  postData: {
    jsonObj: boolean;
    paramsObj: ParsedUrlQueryInput | undefined;
    mimeType: string;
    text: string;
    params: Param[];
    boundary: string;
  }
}
