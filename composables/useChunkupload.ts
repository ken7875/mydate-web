import type { BaseChunkParams } from './types/chunkUpload';

interface Options {
  fileSize: number;
  signal?: AbortSignal;
  uploadApi: (params: BaseChunkParams) => Promise<any>;
}

export async function useChunkUpload({ fileSize, signal, uploadApi }: Options) {
  const start = 0;
  const end = fileSize - 1;
  try {
    // while (start < fileSize) {
    //   if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
    //   const res = await uploadApi({ start, end, fileSize, signal });
    //   if (res.code === 206) {
    //     start = end;
    //     end = Math.min(end + perChunkSize, fileSize);
    //   } else {
    //     return res;
    //   }
    // }
    const res = await uploadApi({ start, end, fileSize, signal });
    return res;
  } catch (error) {
    console.log(error, 'start+end3');
    return error;
  }
}
