// helpers/product-helpers.js
var db = require("../config/connection");
var collection = require("../config/collections");
const { ObjectId } = require("mongodb");

const productHelpers = require("../helpers/product-helpers");

module.exports = {
  // ==============================
  // Add Product
  // ==============================
  addProduct: (product) => {
    // Return a Promise so .then() works in admin.js
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .insertOne(product)
      .then((data) => data.insertedId) // resolve with the inserted ID
      .catch((err) => {
        console.log("Error adding product:", err);
        throw err; // propagate error to .catch() in admin.js
      });
  },

  // ==============================
  // Get All Products
  // ==============================
  getAllProducts: () => {
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .find()
      .toArray()
      .then((products) => products)
      .catch((err) => {
        console.log("Error fetching products:", err);
        throw err; // propagate error
      });
  },
  deleteProduct: (proId) => {
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .deleteOne({ _id: new ObjectId(proId) });
  },
  getProductDetails: (proId) => {
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ _id: new ObjectId(proId) });
  },
  updateProduct: (proId, proDetails) => {
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .updateOne(
        { _id: new ObjectId(proId) },
        {
          $set: {
            name: proDetails.name,
            category: proDetails.category,
            description: proDetails.description,
            price: parseInt(proDetails.price), // ✅ ADD THIS
          },
        },
      );
  },
};
