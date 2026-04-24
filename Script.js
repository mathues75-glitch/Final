// STORAGE
const getUsers = () => JSON.parse(localStorage.getItem("users")) || [];

const saveUsers = users =>
    localStorage.setItem("users", JSON.stringify(users));

const getUser = () => {
    const email = localStorage.getItem("activeUserEmail");
    if (!email) return null;
    return getUsers().find(u => u.email === email) || null;
};

const isLoggedIn = () =>
    localStorage.getItem("isLoggedIn") === "true";

// HELPERS
const fixImagePath = img => {
    if (!img) return "images/default.png";
    if (img.startsWith("http") || img.startsWith("images/")) return img;
    return "images/" + img;
};

// AUTH
function signup() {
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!username || !email || !password)
        return alert("Fill all fields");

    let users = getUsers();

    if (users.some(u => u.email === email))
        return alert("Account already exists");

    users.push({
        username, email, password,
        profilePic: "default.png",
        cart: [], purchases: [], lastOrder: [],
        storeCredit: 0, points: 0, tradeIns: []
    });

    saveUsers(users);
    alert("Account created!");
}

function login() {
    const email = loginEmail.value;
    const password = loginPassword.value;

    const user = getUsers()
        .find(u => u.email === email && u.password === password);

    if (!user) return alert("Incorrect login");

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("activeUserEmail", user.email);

    updateNavUser();
    location.href = "profile.html";
}

function logout() {
    localStorage.clear();
    location.reload();
}

// PROFILE
function initProfilePage() {
    const user = getUser();
    if (!user || !isLoggedIn()) return showLogin();
    showProfile(user);
}

const showLogin = () => {
    loginBox.style.display = "block";
    profileBox.style.display = "none";
};

function showProfile(user) {
    loginBox.style.display = "none";
    profileBox.style.display = "block";

    welcome.innerText = `Welcome, ${user.username}`;
    emailDisplay.innerText = `Email: ${user.email}`;
    profilePic.src = user.profilePic || "default.png";

    loadLastOrder();
    loadStats();
}

function updateProfile() {
    let users = getUsers();
    let user = getUser();
    if (!user) return;

    const i = users.findIndex(u => u.email === user.email);

    if (newUsername.value) users[i].username = newUsername.value;

    if (newEmail.value) {
        users[i].email = newEmail.value;
        localStorage.setItem("activeUserEmail", newEmail.value);
    }

    saveUsers(users);
    alert("Profile updated!");
}

function uploadPic(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        let users = getUsers();
        let user = getUser();
        const i = users.findIndex(u => u.email === user.email);

        users[i].profilePic = reader.result;
        saveUsers(users);

        profilePic.src = reader.result;
    };

    reader.readAsDataURL(file);
}

// CART
function addToCart(name, price, image) {
    if (!isLoggedIn()) return alert("Login first");

    let users = getUsers();
    let user = getUser();
    const i = users.findIndex(u => u.email === user.email);

    users[i].cart.push({ name, price, image: fixImagePath(image) });

    saveUsers(users);
    updateCartCount();
    showToast(`${name} added to cart 🛒`);
}

function removeFromCart(i) {
    let users = getUsers();
    let user = getUser();
    const index = users.findIndex(u => u.email === user.email);

    users[index].cart.splice(i, 1);

    saveUsers(users);
    loadCart();
    updateCartCount();
}

function loadCart() {
    const user = getUser();
    if (!user) return;

    cartItems.innerHTML = "";

    let total = 0;

    user.cart.forEach((item, i) => {
        total += Number(item.price);

        cartItems.innerHTML += `
            <div class="shop-box">
                <img src="${item.image}">
                <h3>${item.name}</h3>
                <p>$${item.price}</p>
                <button onclick="removeFromCart(${i})">Remove</button>
            </div>`;
    });

    let credit = user.storeCredit || 0;
    let remaining = total;

    if (useCreditToggle?.checked)
        remaining = Math.max(0, total - credit);

    cartTotal.innerText = `Cart Total: $${total}`;
    creditAvailable.innerText = `Store Credit: $${credit}`;
    remainingBalance.innerText = `Remaining: $${remaining}`;
}

// CHECKOUT
function checkout() {
    let users = getUsers();
    let user = getUser();
    const i = users.findIndex(u => u.email === user.email);

    if (!users[i].cart.length)
        return alert("Cart empty");

    const order = [...users[i].cart];
    let total = order.reduce((s, x) => s + Number(x.price), 0);

    let creditUsed = 0;
    let cashPaid = total;

    if (useCreditToggle?.checked) {
        creditUsed = Math.min(users[i].storeCredit || 0, total);
        cashPaid = total - creditUsed;
        users[i].storeCredit -= creditUsed;
    }

    const pointsEarned = Math.floor(cashPaid * 0.1);
    users[i].points += pointsEarned;

    users[i].purchases.push(...order);
    users[i].lastOrder = order;
    users[i].cart = [];

    saveUsers(users);

    localStorage.setItem("lastPayment", JSON.stringify({
        total, creditUsed, cashPaid, pointsEarned
    }));

    location.href = "receipt.html";
}

// RECEIPT
function loadReceipt() {
    const user = getUser();
    if (!user) return;

    const payment = JSON.parse(localStorage.getItem("lastPayment")) || {};

    receiptItems.innerHTML = "";

    user.lastOrder.forEach(item => {
        receiptItems.innerHTML += `
            <div class="shop-box">
                <img src="${item.image}">
                <h3>${item.name}</h3>
                <p>$${item.price}</p>
            </div>`;
    });

    receiptTotal.innerHTML = `
        <p>Total: $${payment.total || 0}</p>
        <p>Credit Used: $${payment.creditUsed || 0}</p>
        <p>Cash Paid: $${payment.cashPaid || 0}</p>
        <p>Points Earned: ${payment.pointsEarned || 0}</p>`;
}

// STATS + HISTORY
function loadStats() {
    const user = getUser();
    if (!user) return;

    const totalSpent = user.purchases
        .reduce((s, i) => s + Number(i.price || 0), 0);

    document.getElementById("totalSpent").innerText =
        `Total Spent: $${totalSpent}`;

    document.getElementById("itemsBought").innerText =
        `Items Bought: ${user.purchases.length}`;

    document.getElementById("storeCredit").innerText =
        `Store Credit: $${user.storeCredit}`;

    document.getElementById("userPoints").innerText =
        `Points: ${user.points}`;
}

function loadLastOrder() {
    const user = getUser();
    if (!user) return;

    lastOrderBox.innerHTML = "";

    if (!user.lastOrder.length)
        return lastOrderBox.innerHTML = "<p>No recent order</p>";

    user.lastOrder.forEach(item => {
        lastOrderBox.innerHTML += `
            <div class="shop-box">
                <img src="${fixImagePath(item.image)}">
                <p>${item.name}</p>
            </div>`;
    });
}

// NAV + UI
const updateCartCount = () => {
    const user = getUser();
    cartCount.innerText = user ? user.cart.length : 0;
};

function updateNavUser() {
    const user = getUser();
    navUser.innerText =
        user && isLoggedIn() ? `Hi, ${user.username}` : "Profile";
}

// REWARDS + TRADE-IN
function convertPointsToCredit() {
    let users = getUsers();
    let user = getUser();
    if (!user) return alert("Not logged in");

    const i = users.findIndex(u => u.email === user.email);
    let points = users[i].points;

    if (points < 10)
        return alert("Not enough points (minimum 10)");

    const credit = Math.floor(points / 10);

    users[i].storeCredit += credit;
    users[i].points = points % 10;

    saveUsers(users);
    loadStats();

    alert(`Converted ${credit} credit added!`);
}

function tradeInConsole() {
    const user = getUser();
    if (!user) return alert("Please log in first!");

    const type = consoleSelect.value;
    const condition = conditionSelect.value;

    let base = {
        ps5: 350, ps4: 150, ps3: 60, ps2: 40, ps1: 20,
        psp: 35, psvita: 50,
        xboxseries: 320, xboxone: 130, xbox360: 70,
        switch: 180, switcholed: 200,
        wii: 50, wiiu: 80, ds: 30, "3ds": 45,
        gamecube: 90, n64: 70, sega: 60
    }[type] || 0;

    let mult = { excellent: 1, good: .8, fair: .6, poor: .4 }[condition] || 0;

    const credit = Math.round(base * mult);

    if (!credit)
        return tradeResult.innerText = "Not eligible.";

    let users = getUsers();
    const i = users.findIndex(u => u.email === user.email);

    users[i].storeCredit += credit;
    users[i].tradeIns.push({
        console: type, condition, credit,
        date: new Date().toLocaleDateString()
    });

    saveUsers(users);
    tradeResult.innerText = `+$${credit} credit added`;
}

// TOAST
function showToast(msg) {
    let t = document.getElementById("toast");

    if (!t) {
        t = document.createElement("div");
        t.id = "toast";
        document.body.appendChild(t);
        Object.assign(t.style, {
            position: "fixed",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#222",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "10px",
            opacity: "0",
            transition: "0.3s",
            zIndex: "9999"
        });
    }

    t.innerText = msg;
    t.style.opacity = "1";

    setTimeout(() => t.style.opacity = "0", 1200);
}