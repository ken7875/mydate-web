interface Options {
  perChunkSize: number;
  fileSize: number;
  uploadApi: (params: { start: number; end: number; fileSize: number }) => Promise<any>;
}

export async function useChunkUpload({ perChunkSize, fileSize, uploadApi }: Options) {
  try {
    let start = 0;
    let end = Math.min(perChunkSize, fileSize);

    while (start < fileSize) {
      const res = await uploadApi({ start, end, fileSize });

      if (res.code === 206) {
        start = end + 1;
        end = Math.min(end + perChunkSize, fileSize);
      } else {
        return res;
      }
    }

    return { code: 200 };
  } catch (error) {
    return error;
  }
}
