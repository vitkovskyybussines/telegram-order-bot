// miniapp/v2/src/core/state.js

export const state = {
  screen: 'catalog',
  activeCategory: 'all',
  currentProduct: null,
  cart: {},
  comment: '',
  scrollY: 0
};

export function setState(patch) {
  Object.assign(state, patch);
}
