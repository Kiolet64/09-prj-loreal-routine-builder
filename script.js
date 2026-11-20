/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const userInput = document.getElementById("userInput");
const chatSubmitButton = document.getElementById("sendBtn");

/* Send requests through the class Worker so no API key is exposed in the browser */
const workerUrl = "https://09-prj-loreal-routine-builder.jasminv206.workers.dev/";
const messages = [
  {
    role: "system",
    content:
      "You are a helpful L'Oréal beauty advisor. Create safe, clear routines using only the products provided by the user. Explain when and how to use each product.",
  },
];

let allProducts = [];
let selectedProducts = [];
let requestInProgress = false;
let chatStatus = "";
let chatStatusIsError = false;

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
  generateRoutineButton.disabled =
    selectedProducts.length === 0 || requestInProgress;

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

/* Display the conversation as text so replies are treated as plain text */
function displayConversation() {
  chatWindow.innerHTML = "";

  messages.slice(1).forEach((message) => {
    const messageElement = document.createElement("div");
    const speaker = document.createElement("strong");
    const content = document.createElement("p");

    messageElement.className = `chat-message ${message.role}`;
    speaker.textContent = message.role === "user" ? "You" : "Routine Advisor";
    content.textContent = message.content;
    messageElement.append(speaker, content);
    chatWindow.appendChild(messageElement);
  });

  if (chatStatus) {
    const statusElement = document.createElement("p");
    statusElement.className = chatStatusIsError
      ? "chat-status error"
      : "chat-status";
    statusElement.setAttribute(
      chatStatusIsError ? "role" : "aria-live",
      chatStatusIsError ? "alert" : "polite"
    );
    statusElement.textContent = chatStatus;
    chatWindow.appendChild(statusElement);
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Ask the class Worker for a reply using the full conversation */
async function getAdvisorReply() {
  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(
      `The Worker returned an error (${response.status}). Check the Worker URL and try again.`
    );
  }

  const data = await response.json();
  const reply =
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  if (typeof reply !== "string" || reply.length === 0) {
    throw new Error(
      "The Worker response did not contain choices[0].message.content."
    );
  }

  return reply;
}

/* Send a user message and display the advisor's response */
async function sendMessageToAdvisor(userMessage, statusMessage) {
  if (requestInProgress) {
    return;
  }

  requestInProgress = true;
  generateRoutineButton.disabled = true;
  chatSubmitButton.disabled = true;
  userInput.disabled = true;
  chatStatus = statusMessage;
  chatStatusIsError = false;
  messages.push({ role: "user", content: userMessage });
  displayConversation();

  try {
    const reply = await getAdvisorReply();
    messages.push({ role: "assistant", content: reply });
    chatStatus = "";
  } catch (error) {
    messages.pop();
    chatStatus = `Could not get an advisor reply: ${error.message}`;
    chatStatusIsError = true;
  } finally {
    requestInProgress = false;
    chatSubmitButton.disabled = false;
    userInput.disabled = false;
    displaySelectedProducts();
    displayConversation();
  }
}

/* Send only selected product details when the user requests a routine */
generateRoutineButton.addEventListener("click", () => {
  if (selectedProducts.length === 0) {
    return;
  }

  const productsForRoutine = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));
  /* Start a fresh routine so earlier, now-unselected products are not sent */
  messages.splice(1);
  const userMessage = `Create a personalized routine using only these selected products. Return clear steps and explain when to use each product. Product data:\n${JSON.stringify(
    productsForRoutine,
    null,
    2
  )}`;

  sendMessageToAdvisor(userMessage, "Generating your routine...");
});

/* Send follow-up questions with the existing conversation for context */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (messages.length === 1) {
    chatStatus = "Generate a routine with selected products before asking a follow-up question.";
    chatStatusIsError = false;
    displayConversation();
    return;
  }

  const question = userInput.value.trim();

  if (question) {
    sendMessageToAdvisor(question, "The advisor is responding...");
    userInput.value = "";
  }
});
