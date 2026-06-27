var db = require("../config/connection");
var collection = require("../config/collections");
const { ObjectId } = require("mongodb");

module.exports = {
  addProduct: (product) => {
    return new Promise((resolve, reject) => {
      product.price = Number(product.price);
      product.discount = Number(product.discount || 0);
      product.finalPrice = Math.round(
        product.price - (product.price * product.discount) / 100,
      );
      product.stock = Number(product.stock || 0);
      product.originalBox = product.originalBox === "true";

      // accessories comes as string or array from form checkboxes
      if (product.accessories) {
        if (!Array.isArray(product.accessories)) {
          product.accessories = [product.accessories];
        }
      } else {
        product.accessories = [];
      }

      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .insertOne(product)
        .then((data) => {
          resolve(data.insertedId);
        })
        .catch(reject);
    });
  },

  getAllProducts: () => {
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .find()
      .toArray()
      .then((products) => products)
      .catch((err) => {
        console.log("Error fetching products:", err);
        throw err;
      });
  },

  // get products filtered by category
  getProductsByCategory: (category) => {
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .find({ category })
      .toArray()
      .catch((err) => {
        console.log("Error fetching by category:", err);
        throw err;
      });
  },

  // get covers or screen guards filtered by brand and model
  getProductsByBrandModel: (category, brand, model) => {
    let query = { category };
    if (brand) query.brand = brand;
    if (model) query.model = model;
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .find(query)
      .toArray()
      .catch((err) => {
        console.log("Error fetching by brand/model:", err);
        throw err;
      });
  },

  // get gadgets filtered by subCategory
  getGadgetsBySubCategory: (subCategory) => {
    let query = { category: "Gadgets" };
    if (subCategory) query.subCategory = subCategory;
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .find(query)
      .toArray()
      .catch((err) => {
        console.log("Error fetching gadgets:", err);
        throw err;
      });
  },

  // get used mobiles filtered by brand, condition, storage
  getUsedMobiles: (filters = {}) => {
    let query = { category: "Used Mobile" };
    if (filters.brand) query.brand = filters.brand;
    if (filters.storage) query.storage = filters.storage;
    if (filters.condition) query.condition = filters.condition;
    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .find(query)
      .toArray()
      .catch((err) => {
        console.log("Error fetching used mobiles:", err);
        throw err;
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
    // build update object with all possible fields
    const updateData = {
      name: proDetails.name,
      category: proDetails.category,
      brand: proDetails.brand,
      model: proDetails.model,
      description: proDetails.description,
      price: Number(proDetails.price),
      discount: Number(proDetails.discount || 0),
      finalPrice: Math.round(
        Number(proDetails.price) -
          (Number(proDetails.price) * Number(proDetails.discount || 0)) / 100,
      ),
      stock: Number(proDetails.stock || 0),
      returnPolicy: proDetails.returnPolicy,
      replacementPolicy: proDetails.replacementPolicy,
      warranty: proDetails.warranty,

      // cover / screen guard fields
      type: proDetails.type || null,
      material: proDetails.material || null,
      color: proDetails.color || null,

      // gadget fields
      subCategory: proDetails.subCategory || null,
      connectivity: proDetails.connectivity || null,
      batteryLife: proDetails.batteryLife || null,
      noiseCancellation: proDetails.noiseCancellation || null,
      watt: proDetails.watt || null,
      portType: proDetails.portType || null,
      capacity: proDetails.capacity || null,

      // used mobile fields
      storage: proDetails.storage || null,
      ram: proDetails.ram || null,
      condition: proDetails.condition || null,
      batteryHealth: proDetails.batteryHealth || null,
      originalBox: proDetails.originalBox === "true",
      accessories: proDetails.accessories
        ? Array.isArray(proDetails.accessories)
          ? proDetails.accessories
          : [proDetails.accessories]
        : [],
    };

    return db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .updateOne({ _id: new ObjectId(proId) }, { $set: updateData });
  },
};
