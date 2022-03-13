import { PostData } from "./PostData";

export interface Source {
  method: string;
  fullUrl: string;
  headersObj: Record<string, string>;
  allHeaders: {
    cookie: string;
  }
  postData: PostData
}
