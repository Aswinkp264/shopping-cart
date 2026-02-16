var express = require("express");
var router = express.Router();
var productHelper = require("../helpers/product-helpers");

// View products
router.get("/", function (req, res) {
  res.render("admin/view-products", { admin: true, Products });
});

// Dummy products (temporary)
let Products = [
  {
    name: "samsung S25",
    category: "mobile",
    description: "256GB",
    image: "sample.jpg",
  },
];

// Add product page
router.get("/add-products", function (req, res) {
  res.render("admin/add-products", { admin: true });
});

// Add product POST
router.post("/add-products", (req, res) => {
  productHelper.addProduct(req.body, (id) => {
    if (req.files && req.files.image) {
      let image = req.files.image;

      image.mv("./public/product-images/" + id + ".jpg", (err) => {
        if (!err) {
          res.redirect("/admin");
        } else {
          console.log(err);
        }
      });
    } else {
      res.redirect("/admin");
    }
  });
});

module.exports = router;
