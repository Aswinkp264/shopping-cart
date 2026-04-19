var express = require("express");
var router = express.Router();
var productHelper = require("../helpers/product-helpers");

// ==============================
// View All Products
// ==============================
router.get("/", function (req, res) {
  productHelper
    .getAllProducts()
    .then((products) => {
      res.render("admin/view-products", {
        admin: true,
        products: products,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error loading products");
    });
});

// ==============================
// Add Product Page
// ==============================
router.get("/add-products", function (req, res) {
  res.render("admin/add-products", { admin: true });
});

// ==============================
// Add Product POST
// ==============================
router.post("/add-products", function (req, res) {
  productHelper
    .addProduct(req.body)
    .then((id) => {
      if (req.files && req.files.image) {
        let image = req.files.image;

        // 🔥 Always save image as .jpg
        image.mv("./public/product-images/" + id + ".jpg", (err) => {
          if (err) {
            console.log("Image upload error:", err);
            return res.status(500).send("Image upload failed");
          }

          res.redirect("/admin");
        });
      } else {
        res.redirect("/admin");
      }
    })
    .catch((err) => {
      console.log("Product add error:", err);
      res.status(500).send("Error adding product");
    });
});

module.exports = router;
