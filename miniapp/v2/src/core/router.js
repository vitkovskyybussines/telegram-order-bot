import { state } from './state.js';
import { renderCatalog } from '../ui/CatalogView.js';
import { renderProduct } from '../ui/ProductView.js';
import { renderCart } from '../ui/CartView.js';

export function renderScreen() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  if (state.screen === 'catalog') renderCatalog();
  if (state.screen === 'product') renderProduct();
  if (state.screen === 'cart') renderCart();
}
