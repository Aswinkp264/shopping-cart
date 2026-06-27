var express = require("express");
var router = express.Router();
var productHelper = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const serviceHelpers = require("../helpers/service-helpers");
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

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
    } else if (response.blocked) {
      req.session.logginErr = "Your account has been blocked. Contact support.";
      res.redirect("/login");
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
      cartCount += item.quantity;
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

router.get("/checkout", verifyLogin, async (req, res) => {
  let cartCount = await getCartCount(req.session.user._id);
  userHelpers.getCartProducts(req.session.user._id).then((products) => {
    let total = 0;
    products.forEach((item) => {
      total += item.subtotal;
    });
    res.render("user/checkout", {
      user: req.session.user,
      products,
      total,
      cartCount,
    });
  });
});

router.post("/place-order", verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id);
  let total = 0;
  products.forEach((item) => {
    total += item.subtotal;
  });

  let order = {
    ...req.body,
    userId: req.session.user._id,
  };

  if (req.body.paymentMethod === "COD") {
    userHelpers.placeOrder(order, products, total).then(() => {
      res.redirect("/order-success");
    });
  } else {
    req.session.orderData = { order, products, total };
    res.redirect("/razorpay-payment");
  }
});

router.get("/order-success", verifyLogin, (req, res) => {
  let user = req.session.user;
  res.render("user/order-success", { user });
});

router.get("/orders", verifyLogin, async (req, res) => {
  let cartCount = await getCartCount(req.session.user._id);
  userHelpers.getUserOrders(req.session.user._id).then((orders) => {
    res.render("user/orders", {
      user: req.session.user,
      orders,
      cartCount,
    });
  });
});

router.get("/razorpay-payment", verifyLogin, async (req, res) => {
  let { order, products, total } = req.session.orderData;
  let cartCount = await getCartCount(req.session.user._id);

  userHelpers.createRazorpayOrder(total).then((razorpayOrder) => {
    res.render("user/razorpay-payment", {
      user: req.session.user,
      razorpayOrder,
      total,
      cartCount,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  });
});

router.post("/verify-payment", verifyLogin, async (req, res) => {
  userHelpers.verifyPayment(req.body).then(async (verified) => {
    if (verified) {
      let { order, products, total } = req.session.orderData;
      userHelpers.placeOrder(order, products, total).then(() => {
        req.session.orderData = null;
        res.json({ status: true });
      });
    } else {
      res.json({ status: false, message: "Payment verification failed" });
    }
  });
});

router.post("/return-order/:id", verifyLogin, (req, res) => {
  userHelpers.returnOrder(req.params.id, req.body.reason).then(() => {
    res.json({ status: true });
  });
});

// 👈 UPDATED - profile with ordersCount and cartCount
router.get("/profile", verifyLogin, async (req, res) => {
  let cartCount = await getCartCount(req.session.user._id);
  let user = await userHelpers.getUserDetails(req.session.user._id);
  let orders = await userHelpers.getUserOrders(req.session.user._id);

  user.ordersCount = orders.length;

  res.render("user/profile", {
    user,
    cartCount,
    userLoggedIn: true,
  });
});

router.post("/update-profile", verifyLogin, (req, res) => {
  userHelpers.updateProfile(req.session.user._id, req.body).then(() => {
    res.redirect("/profile");
  });
});

router.post("/change-password", verifyLogin, async (req, res) => {
  await userHelpers.changePassword(
    req.session.user._id,
    req.body.currentPassword,
    req.body.newPassword,
  );
  res.redirect("/profile");
});

// 👈 ADDED
router.post("/add-address", verifyLogin, (req, res) => {
  userHelpers.addAddress(req.session.user._id, req.body).then(() => {
    res.redirect("/profile");
  });
});

// 👈 ADDED
router.get("/delete-address/:id", verifyLogin, (req, res) => {
  userHelpers.deleteAddress(req.session.user._id, req.params.id).then(() => {
    res.redirect("/profile");
  });
});
router.get("/book-service", verifyLogin, async (req, res) => {
  let cartCount = await getCartCount(req.session.user._id);
  res.render("user/book-service", {
    user: req.session.user,
    cartCount,
  });
});

router.post("/book-service", verifyLogin, (req, res) => {
  serviceHelpers.createBooking(req.session.user._id, req.body).then(() => {
    res.redirect("/booking-success");
  });
});

router.get("/booking-success", verifyLogin, (req, res) => {
  res.render("user/booking-success", { user: req.session.user });
});

router.get("/my-bookings", verifyLogin, async (req, res) => {
  let cartCount = await getCartCount(req.session.user._id);
  let bookings = await serviceHelpers.getUserBookings(req.session.user._id);
  res.render("user/my-bookings", {
    user: req.session.user,
    bookings,
    cartCount,
  });
});

router.post("/cancel-booking/:id", verifyLogin, (req, res) => {
  serviceHelpers.cancelBooking(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

module.exports = router;
