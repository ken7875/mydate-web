export function useDownloadImage() {
  const isBlobUrl = (url: string) => url.startsWith('blob:');

  const downloadImage = async (url: string) => {
    if (!url) return;

    const anchor = document.createElement('a');
    anchor.download = `image_${Date.now()}`;

    if (isBlobUrl(url)) {
      anchor.href = url;
      anchor.click();
      return;
    }

    const res = await fetch(useStaticImage(url), { mode: 'cors', credentials: 'omit' });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    anchor.href = objectUrl;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  return { downloadImage };
}
