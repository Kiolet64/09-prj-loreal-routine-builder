/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

let allProducts = [];
let selectedProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create product cards and show which products are selected */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => {
        const isSelected = selectedProducts.some(
          (selectedProduct) => selectedProduct.id === product.id
        );

        return `
          <article
            class="product-card${isSelected ? " selected" : ""}"
            data-product-id="${product.id}"
          >
            <button
              type="button"
              class="product-select"
              aria-pressed="${isSelected}"
            >
              <img src="${product.image}" alt="">
              <span class="product-info">
                <span class="product-name">${product.name}</span>
                <span class="product-brand">${product.brand}</span>
              </span>
            </button>
            <details class="product-description">
              <summary>Product description</summary>
              <p>${product.description}</p>
            </details>
          </article>
        `;
      }
    )
    .join("");
}

/* Show selected products and provide a button to remove each one */
function displaySelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="empty-selection">No products selected yet.</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product">
          <span>${product.name} <small>${product.brand}</small></span>
          <button
            type="button"
            class="remove-product"
            data-product-id="${product.id}"
            aria-label="Remove ${product.name}"
          >
            Remove
          </button>
        </div>
      `
    )
    .join("");
}

/* Keep the visible card in sync when a product is removed from the list */
function updateProductCard(productId, isSelected) {
  const productCard = Array.from(
    productsContainer.querySelectorAll(".product-card")
  ).find((card) => card.dataset.productId === productId);

  if (productCard) {
    productCard.classList.toggle("selected", isSelected);
    productCard
      .querySelector(".product-select")
      .setAttribute("aria-pressed", isSelected);
  }
}

/* Add or remove a product, then update both parts of the page */
function setProductSelected(productId, isSelected) {
  if (isSelected) {
    const product = allProducts.find(
      (item) => String(item.id) === productId
    );

    if (product) {
      selectedProducts.push(product);
    }
  } else {
    selectedProducts = selectedProducts.filter(
      (product) => String(product.id) !== productId
    );
  }

  updateProductCard(productId, isSelected);
  displaySelectedProducts();
}

/* Select or unselect a product with its selection button */
productsContainer.addEventListener("click", (e) => {
  const productSelect = e.target.closest(".product-select");

  if (productSelect) {
    const productId = productSelect.closest(".product-card").dataset.productId;
    const isSelected = productSelect.getAttribute("aria-pressed") !== "true";
    setProductSelected(productId, isSelected);
  }
});

/* Allow products to be removed directly from the selected products list */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-product");

  if (removeButton) {
    setProductSelected(removeButton.dataset.productId, false);
  }
});

displaySelectedProducts();

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  allProducts = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const visibleProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(visibleProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
