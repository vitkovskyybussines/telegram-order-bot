export const state = {
  screen: 'catalog',
  currentProduct: null,
  cart: {},
  comment: ''
};

export function setState(patch) {
  Object.assign(state, patch);
}
