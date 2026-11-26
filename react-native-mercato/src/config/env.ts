export const ENV = {
  // Automatically hides demo API key / store-switching settings in production release builds
  SHOW_STORE_SETUP: typeof __DEV__ !== 'undefined' ? __DEV__ : true,
};
