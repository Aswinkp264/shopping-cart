var express = require("express");
var router = express.Router();
var productHelper = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

// 👈 FIXED - sum all quantities
async function getCartCount(userId) {
  const cartProducts = await userHelpers.getCartProducts(userId);
  let count = 0;
  cartProducts.forEach((item) => {
    count += item.quantity;
  });
  return count;
}

router.get("/", async function (req, res) {
  let user = req.session.user;
  let cartCount = 0;
  if (user) {
    cartCount = await getCartCount(user._id);
  }
  productHelper
    .getAllProducts()
    .then((products) => {
      res.render("user/view-products", {
        products: products,
        user,
        admin: false,
        cartCount,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error loading products");
    });
});

router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", {
      layout: false,
      logginErr: req.session.logginErr ? "Invalid email or password" : null,
    });
    req.session.logginErr = false;
  }
});

router.get("/signup", (req, res) => {
  res.render("user/signup", { layout: false });
});

router.post("/signup", (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response);
    res.redirect("/login");
  });
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      req.session.logginErr = true;
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

router.get("/cart", verifyLogin, async (req, res) => {
  userHelpers.getCartProducts(req.session.user._id).then((products) => {
    let total = 0;
    let cartCount = 0;
    products.forEach((item) => {
      total += item.subtotal;
      cartCount += item.quantity; // 👈 FIXED - sum quantities
    });
    res.render("user/cart", {
      products,
      user: req.session.user,
      total,
      cartCount,
    });
  });
});

router.get("/add-to-cart/:id", verifyLogin, (req, res) => {
  userHelpers
    .addToCart(req.params.id, req.session.user._id)
    .then(() => {
      res.json({ status: true });
    })
    .catch(() => {
      res.json({ status: false });
    });
});

router.get("/remove-from-cart/:id", verifyLogin, (req, res) => {
  userHelpers.removeFromCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

router.post("/change-quantity", verifyLogin, (req, res) => {
  userHelpers
    .changeQuantity(req.body.proId, req.session.user._id, req.body.action)
    .then((response) => {
      res.json(response);
    });
});

module.exports = router;
