var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { resolve, reject } = require("promise");
const { Result } = require("pg");
const { ObjectId } = require("mongodb");

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          resolve(data.insertedId);
        });
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            console.log("login success");
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            console.log("Failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("login failed");
        resolve({ status: false });
      }
    });
  },
  addToCart: (proId, userId) => {
    let proObj = {
      item: new ObjectId(proId),
      quantity: 1,
    };

    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });

      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item.toString() === proId,
        );

        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              {
                user: new ObjectId(userId),
                "products.item": new ObjectId(proId),
              },
              {
                $inc: { "products.$.quantity": 1 },
              },
            )
            .then(() => resolve());
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: new ObjectId(userId) },
              {
                $push: { products: proObj },
              },
            )
            .then(() => resolve());
        }
      } else {
        let cartObj = {
          user: new ObjectId(userId),
          products: [proObj],
        };

        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then(() => resolve());
      }
    });
  },
  removeFromCart: (proId, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { user: new ObjectId(userId) },
          {
            $pull: { products: { item: new ObjectId(proId) } },
          },
        )
        .then(() => resolve());
    });
  },
  // 👈 ADDED
  changeQuantity: (proId, userId, action) => {
    return new Promise(async (resolve, reject) => {
      let change = action === "increment" ? 1 : -1;

      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: new ObjectId(userId) });

      let product = userCart.products.find((p) => p.item.toString() === proId);

      if (product.quantity === 1 && action === "decrement") {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { user: new ObjectId(userId) },
            { $pull: { products: { item: new ObjectId(proId) } } },
          )
          .then(() => resolve({ removed: true }));
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              user: new ObjectId(userId),
              "products.item": new ObjectId(proId),
            },
            { $inc: { "products.$.quantity": change } },
          )
          .then(() => resolve({ removed: false }));
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: new ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $addFields: {
              subtotal: {
                $multiply: ["$quantity", { $toDouble: "$product.price" }],
              },
            },
          },
        ])
        .toArray();

      resolve(cartItems);
    });
  },
};
