export const InventoryLocators = {
  title: '[data-test="title"]',
  item: '[data-test="inventory-item"]',
  itemName: '[data-test="inventory-item-name"]',
  itemPrice: '[data-test="inventory-item-price"]',
  cartLink: '[data-test="shopping-cart-link"]',
  cartBadge: '[data-test="shopping-cart-badge"]',
  sortSelect: '[data-test="product-sort-container"]',
  addToCart: (slug: string): string => `[data-test="add-to-cart-${slug}"]`,
  removeFromCart: (slug: string): string => `[data-test="remove-${slug}"]`,
} as const;
