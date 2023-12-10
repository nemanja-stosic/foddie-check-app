import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js'
import axios from "https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm";

const firebaseConfig = {
  apiKey: "AIzaSyDAEshcJwkRNB8Pk6sS0HiX6fzGXeIng7c",
  authDomain: "foddie-check-db.firebaseapp.com",
  projectId: "foddie-check-db",
  storageBucket: "foddie-check-db.appspot.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getFirestore(app);

const API_KEY = "ZWI5MjI4MDktMGQ3NC00M2Y1LWIyZDgtZDI3NjliY2E3NTIx";
const ONESIGNAL_APP_ID = "607d9301-401e-47e0-8328-562bdb033b2e";
const BASE_URL = "https://onesignal.com/api/v1/";

const greetingMessage = document.getElementById("greeting-mesesage");
const inputFieldItem = document.getElementById("input-field-item");
const inputFieldPrice = document.getElementById("input-field-price");
const addButton = document.getElementById("add-button");
const reminderButton = document.getElementById("reminder-button");
const resetButton = document.getElementById("reset-button");
const logoutButton = document.getElementById("logout-btn");
const balanceButton = document.getElementById("balance-button-id");
const shoppingList = document.getElementById("shopping-list");
const importantReminderInfo = document.getElementById("important-reminder");

const balanceText = document.getElementById("balance-text");
const errorMessage = document.getElementById("error-message");
const spentSum = document.getElementById("spent-sum");

let isReminderOn = false;
let reminderWorker = null;

let userMoney = 0;

//original balnce what user sets
let balance = 0;

//price sum that needs to be subtracted
let sumPrice = 0;

const collectionName = "items";

//this array holds all prices of items
let pricesHistory = [];

//this array saves prices of items that are deleted for calculating sum price
// of how much user will spend even if item is deleted.
let deletedItemsPricesHistory = [];

let itemIDs = [];
//this needs to be empty so that editing another item be even possible
let currentItemID = "";

onAuthStateChanged(auth, (user) => {
  // User is logged out
  if (!user) {
    window.location.href = "../../index.html";
  } else {
    //logged in user -- show him greeting message
    showUserGreeting(greetingMessage, user);
    fetchAllItems(user);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error.message);
  }
});

addButton.addEventListener("click", function () {
  let inputFieldItemValue = inputFieldItem.value.trim();
  let inputFieldPriceValue = inputFieldPrice.value.trim();

  const user = auth.currentUser;

  if (validateFields(inputFieldItemValue, inputFieldPriceValue)) {
    sumPrice = 0;
    resetPricesHistory();

    errorMessage.style.display = "none";

    addItemToDB(user, inputFieldItemValue, inputFieldPriceValue);

    clearInputText();
    updateMoney(balance);
  }
});

reminderButton.addEventListener("click", async function () {
  if (shoppingList.textContent === "Your shopping list items 🛒🛒🛒") {
    reminderButton.disable = true;
  } else {
    importantReminderInfo.style.display = "block";
    balanceButton.style.marginTop = "15px";

    if (!isReminderOn) {
      // Start the reminder if it's not already ON
      isReminderOn = true;
      reminderButton.textContent = "Reminder: ON";

      if (!reminderWorker) {
        // Create a new Web Worker if it doesn't exist
        reminderWorker = new Worker("/js/reminderWorker.js");

        reminderWorker.addEventListener("message", (event) => {
          if (event.data === "sendNotification") {
            try {
              //if there are no items send last notification and set reminder to OFF
              if (shoppingList.textContent === "Your shopping list items 🛒🛒🛒") {
                stopReminderWorker();
              }

              createAndSendNotification(body);
            } catch (error) {
              console.error("Error sending notification:", error);
            }
          }
        });

        reminderWorker.postMessage("startReminder");
      }
    } else {
      balanceButton.style.marginTop = "45px";
      stopReminderWorker();
    }
  }
});

balanceButton.addEventListener("click", () => {
  const money = document.getElementById("money");

  const input = document.createElement("input");
  input.type = "text";
  input.value = money.textContent;
  input.classList.add("set-money-input");
  input.setAttribute("id", "edit-money-input");
  balanceText.insertBefore(input, money);

  //set focus on input field
  setTimeout(() => {
    input.focus();
    input.select();
  }, 0);

  balanceText.removeChild(money);

  //if user left focus of input field save edit
  input.addEventListener("blur", () => {
    const editMoneyInput = document.getElementById("edit-money-input");
    const newMoneyValue = document.createElement("span");
    newMoneyValue.setAttribute("id", "money");

    //if edit value is not the same then user made changes 
    if (parseInt(editMoneyInput.value) !== parseInt(userMoney)) {
      let newMoneyInput = editMoneyInput.value;

      balance = newMoneyInput;

      userMoney = calculateBalance(newMoneyInput, sumPrice);

      newMoneyValue.textContent = userMoney;

      balanceText.insertBefore(newMoneyValue, editMoneyInput);
      balanceText.removeChild(editMoneyInput);

    } else {
      // edit canceled
      newMoneyValue.textContent = userMoney;

      balanceText.insertBefore(newMoneyValue, editMoneyInput);
      balanceText.removeChild(editMoneyInput);

    }
  });
});

resetButton.addEventListener("dblclick", () => {
  deletedItemsPricesHistory = [];
  updateSpentSumUI();
});

function stopReminderWorker() {
  isReminderOn = false;
  reminderButton.textContent = "Reminder: OFF";

  if (reminderWorker) {
    // Terminate the Web Worker
    reminderWorker.postMessage("stopReminder");
    reminderWorker.terminate();
    reminderWorker = null;
    importantReminderInfo.style.display = "none";
  }
}

function fetchInRealtimeAndRenderItemsFromDB(query, user) {
  //listens for changes in db and runs code everytime there is update
  onSnapshot(query, (querySnapshot) => {
    clearAll(shoppingList);
    shoppingList.textContent = "Your shopping list items 🛒🛒🛒"
    updateSpentSumUI();

    querySnapshot.forEach((doc) => {
      renderItem(shoppingList, doc);
    });

    //if shopping list is empty and reminder was on, turn it off after delete
    if (shoppingList.textContent === "Your shopping list items 🛒🛒🛒" && isReminderOn) {
      updateMoneyUI();
      balanceButton.style.marginTop = "45px";
      stopReminderWorker();
    } else if (shoppingList.textContent === "Your shopping list items 🛒🛒🛒") {
      updateMoneyUI();
    }
  })
}

function fetchAllItems(user) {
  const itemsRef = collection(database, collectionName);
  const q = query(itemsRef, where("uid", "==", user.uid));

  fetchInRealtimeAndRenderItemsFromDB(q, user);
}

function renderItem(shoppingList, wholeDoc) {
  const itemData = wholeDoc.data();

  //getting all item ids
  itemIDs.push(wholeDoc.id)

  setAndShowMoney(itemData.price);

  //item name
  let liItem = document.createElement("li");

  let itemNameSpan = document.createElement("span");
  itemNameSpan.textContent = itemData.item;

  liItem.addEventListener("dblclick", function () {
    //if there is no current item ID then we can delete item, because edit mode is OFF
    if (currentItemID === "") {
      resetPricesHistory();
      deletedItemsPricesHistory.push(itemData.price);
      resetBalance();
      updateMoney(balance)
      deleteItemFromDB(wholeDoc.id);
    }
  });

  liItem.appendChild(itemNameSpan);

  //price
  let divPrice = document.createElement("div");
  divPrice.className = "price-div";
  divPrice.textContent = itemData.price;

  createEditMode(wholeDoc, itemData, liItem, itemNameSpan, divPrice);

  liItem.appendChild(divPrice);

  shoppingList.appendChild(liItem);

}

function createEditMode(wholeDoc, itemData, liItem, itemNameSpan, divPrice) {
  //edit button
  let editButton = document.createElement("button");
  editButton.className = "edit-button";
  editButton.addEventListener("click", () => {
    //if currentItemID is empty EDIT IS ALLOWED
    if (currentItemID === "") {
      let selectedItem = wholeDoc.id;

      //now we know which item is selected for edit and that edit is ON
      for (let itemID in itemIDs) {
        if (itemIDs[itemID] == selectedItem) {
          currentItemID = itemIDs[itemID];
        }
      }

      const itemNameInput = itemData.item;
      const priceInput = itemData.price;

      const itemNameInputEdit = document.createElement("input");
      itemNameInputEdit.type = "text";
      itemNameInputEdit.value = itemNameInput;
      itemNameInputEdit.classList.add("set-new-item-name");
      itemNameInputEdit.setAttribute("id", "new-item-name-input");
      liItem.insertBefore(itemNameInputEdit, itemNameSpan);

      const priceInputEdit = document.createElement("input");
      priceInputEdit.type = "text";
      priceInputEdit.value = priceInput;
      priceInputEdit.classList.add("set-new-price");
      priceInputEdit.setAttribute("id", "new-price-input");
      liItem.insertBefore(priceInputEdit, divPrice);

      //set focus on input field
      setTimeout(() => {
        itemNameInputEdit.focus();
        itemNameInputEdit.select();
      }, 0);

      liItem.removeChild(itemNameSpan);
      liItem.removeChild(divPrice);
      liItem.removeChild(editButton);

      //create completed edit button
      let completedEditButton = document.createElement("button");
      completedEditButton.className = "completed-edit-button";

      completedEditButton.addEventListener("click", () => {
        //set back item and price how it was and update it with new input values
        liItem.insertBefore(itemNameSpan, itemNameInputEdit);
        liItem.insertBefore(divPrice, priceInputEdit);
        editButton.appendChild(editIcon);
        liItem.insertBefore(editButton, divPrice);

        resetPricesHistory();
        resetBalance();
        updateMoney(balance);

        //update values in db
        updateItemInDB(selectedItem, itemNameInputEdit.value, priceInputEdit.value);

        liItem.removeChild(itemNameInputEdit);
        liItem.removeChild(priceInputEdit);
        liItem.removeChild(completedEditButton);

        //set currentItemID to empty string, need to be empty to be allowed next edit
        currentItemID = "";
      });

      //completed edit button image icon
      let completedEditIcon = document.createElement("img");
      completedEditIcon.src = "/res/completedEditIcon.png";
      completedEditIcon.className = "completed-edit-icon-img";

      completedEditButton.appendChild(completedEditIcon);
      liItem.appendChild(completedEditButton);
    }

  });

  //edit button image icon
  let editIcon = document.createElement("img");
  editIcon.src = "/res/editIcon.png";
  editIcon.className = "edit-icon-img";

  editButton.appendChild(editIcon);

  liItem.appendChild(editButton)
}

async function addItemToDB(user, item, price) {
  try {
    const docRef = await addDoc(collection(database, collectionName), {
      uid: user.uid,
      item: item,
      price: price
    });
  } catch (e) {
    console.error(e.message);
  }
}
async function updateItemInDB(docId, newItemName, newPrice) {
  const itemsRef = doc(database, collectionName, docId);

  await updateDoc(itemsRef, {
    item: newItemName,
    price: newPrice
  });
}

async function deleteItemFromDB(docId) {
  await deleteDoc(doc(database, collectionName, docId));
}

function clearInputText() {
  inputFieldItem.value = "";
  inputFieldPrice.value = "";
}

function clearAll(element) {
  element.innerHTML = "";
}

function setAndShowMoney(price) {
  //user has not set balance (checking setted balance)
  if (price === 0) {
    document.getElementById("money").innerText = "0";
  } else {
    userMoney = calculateBalance(userMoney, price);
    sumPrice += parseInt(price);

    pricesHistory.push(price);

    //update UI
    updateMoneyUI();
    updateSpentSumUI();
  }
}

function updateSpentSumUI() {
  spentSum.textContent = `${sumOfPricesHistory()} din`;
}

function updateMoneyUI() {
  document.getElementById("money").innerText = userMoney;
}

function resetPricesHistory() {
  pricesHistory = [];
}

//calculates how much user is going to spend money and even considers prices from 
//items that user has deleted (he brought them) and this can be reseted with reset btn.
function sumOfPricesHistory() {
  let total = 0;
  for (let i = 0; i < pricesHistory.length; i++) {
    total += parseInt(pricesHistory[i]);
  }

  //if there are prices to deleted array history add it to sum
  if (deletedItemsPricesHistory.length !== 0) {
    for (let i = 0; i < deletedItemsPricesHistory.length; i++) {
      total += parseInt(deletedItemsPricesHistory[i]);
    }

  }

  return total;
}

function resetBalance() {
  userMoney = 0;
  sumPrice = 0;
}

function updateMoney(newValue) {
  userMoney = newValue;
}

function calculateBalance(num1, num2) {
  return parseInt(num1) - parseInt(num2);
}

function validateFields(itemInput, priceInput) {
  if (itemInput === "" ||
    itemInput === null ||
    priceInput === "" ||
    priceInput === null) {
    errorMessage.style.display = "block";
    return false;
  } else {
    return true;
  }
}

//generic function that will build the JSON object based on the parameters that you have passed.
const optionsBuilder = (method, path, body) => {
  return {
    method,
    url: `${BASE_URL}/${path}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${API_KEY}`,
    },
    data: body ? JSON.stringify(body) : null,
  };
};

//This function takes a body parameter that represents the information that the push notification will contain
const createAndSendNotification = async (data) => {
  const postRequest = optionsBuilder("post", "notifications", data);
  try {
    const response = await axios(postRequest);
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const body = {
  app_id: ONESIGNAL_APP_ID,
  name: "Reminder",
  headings: {
    en: "Don't forget your food!",
  },
  contents: {
    // Notification content
    en: `Don't forget to buy everything from your shopping list!`,
  },
  data: {
    image:
      "https://i0.wp.com/www.permaculturaaralar.com/wp-content/uploads/Logo-PCAralar-192x192px.png?fit=192%2C192&ssl=1",
  },
  included_segments: ["Total Subscriptions"], // Target audience
};

function getUserFirstName(user) {
  const displayName = user.displayName;

  if (displayName) {
    // if user has a name
    return displayName.split(" ")[0];
  } else {
    //user does not have name
    return "Customer";
  }
}

function showUserGreeting(element, user) {

  const hour = new Date().getHours();
  const welcomeTypes = ["Morning", "Afternoon", "Evening"];

  let userFirstName = getUserFirstName(user);

  if (hour < 12)
    element.textContent = `${welcomeTypes[0]} ${userFirstName}.`;
  else if (hour < 18)
    element.textContent = `${welcomeTypes[1]} ${userFirstName}.`;
  else
    element.textContent = `${welcomeTypes[2]} ${userFirstName}.`;
}
