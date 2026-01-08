// miniapp/v2/src/app.js

import { state } from './core/state.js';
import { renderCatalog } from './ui/CatalogView.js';
import { renderCart } from './ui/CartView.js';
import { renderProduct } from './ui/ProductView.js';

export function renderScreen() {
  const title = document.getElementById('title');

  if (state.screen === 'catalog') {
    title.textContent = 'Зробити замовлення';
    renderCatalog();
  }

  if (state.screen === 'cart') {
    title.textContent = 'Кошик';
    renderCart();
  }

  if (state.screen === 'product') {
    title.textContent = state.currentProduct?.name || '';
    renderProduct();
  }
}

// старт
renderScreen();
