import type { PostData as HARPostData } from "har-format";

export type PostData = HARPostData & { size: number; }
