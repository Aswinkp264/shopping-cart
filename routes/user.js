var express = require("express");
var router = express.Router();
var productHelper = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const { response } = require("../app");

/* GET home page - User View Products */
router.get("/", function (req, res) {
  let user = req.session.user;
  console.log(user);
  productHelper
    .getAllProducts()
    .then((products) => {
      res.render("user/view-products", {
        // 👈 Better structure
        products: products,
        user,
        admin: false,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error loading products");
    });
});

/* GET Login Page */
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

// Get Registration page

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

module.exports = router;
