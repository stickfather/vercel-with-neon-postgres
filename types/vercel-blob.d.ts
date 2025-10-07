declare module "@vercel/blob" {
  export type PutBlobResult = {
    url: string;
  };

  export type PutOptions = {
    access?: "public" | "private";
    contentType?: string;
    cacheControlMaxAge?: number;
    multipart?: boolean;
  };

  type PutInput =
    | Blob
    | ArrayBuffer
    | ArrayBufferView
    | File
    | NodeJS.ReadableStream;

  export function put(
    path: string,
    data: PutInput,
    options?: PutOptions,
  ): Promise<PutBlobResult>;

  export function del(url: string | URL | Array<string | URL>): Promise<void>;
}
