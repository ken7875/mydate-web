export default (objStr: string, defaultVal: string = '') => {
  try {
    return JSON.parse(objStr);
  } catch (error) {
    console.warn(`json parse error: ${error}`);
    return defaultVal;
  }
};
