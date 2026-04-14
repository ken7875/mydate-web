import type { BaseChunkParams } from './types/chunkUpload';

interface Options {
  perChunkSize: number;
  fileSize: number;
  uploadApi: (params: BaseChunkParams) => Promise<any>;
}

export async function useChunkUpload({ perChunkSize, fileSize, uploadApi }: Options) {
  let start = 0;
  let end = Math.min(perChunkSize, fileSize);
  try {
    while (start < fileSize) {
      const res = await uploadApi({ start, end, fileSize });
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
