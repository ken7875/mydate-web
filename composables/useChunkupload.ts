import type { BaseChunkParams } from './types/chunkUpload';

interface Options {
  perChunkSize: number;
  fileSize: number;
  signal?: AbortSignal;
  uploadApi: (params: BaseChunkParams) => Promise<any>;
}

export async function useChunkUpload({ perChunkSize, fileSize, signal, uploadApi }: Options) {
  let start = 0;
  let end = Math.min(perChunkSize, fileSize);
  try {
    while (start < fileSize) {
      if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
      const res = await uploadApi({ start, end, fileSize, signal });
      if (res.code === 206) {
        start = end;
        end = Math.min(end + perChunkSize, fileSize);
      } else {
        return res;
      }
    }

    return { code: 200 };
  } catch (error) {
    console.log(error, 'start+end3');
    return error;
  }
}
