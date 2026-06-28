var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { resolve, reject } = require("promise");
const { Result } = require("pg");
const { ObjectId } = require("mongodb");
const Razorpay = require("razorpay");
const crypto = require("crypto");

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      userData.phone = userData.phone || "";
      userData.addresses = [];
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
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        if (user.blocked) {
          resolve({ status: false, blocked: true });
          return;
        }
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            resolve({ status: false });
          }
        });
      } else {
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
              { $inc: { "products.$.quantity": 1 } },
            )
            .then(() => resolve());
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: new ObjectId(userId) },
              { $push: { products: proObj } },
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
          { $pull: { products: { item: new ObjectId(proId) } } },
        )
        .then(() => resolve());
    });
  },

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
          { $match: { user: new ObjectId(userId) } },
          { $unwind: "$products" },
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
          // ✅ FIX: use finalPrice when discount exists, else use price
          {
            $addFields: {
              effectivePrice: {
                $cond: {
                  if: { $gt: [{ $ifNull: ["$product.discount", 0] }, 0] },
                  then: { $toDouble: "$product.finalPrice" },
                  else: { $toDouble: "$product.price" },
                },
              },
            },
          },
          {
            $addFields: {
              subtotal: { $multiply: ["$quantity", "$effectivePrice"] },
            },
          },
        ])
        .toArray();
      resolve(cartItems);
    });
  },

  placeOrder: (order, products, total) => {
    return new Promise(async (resolve, reject) => {
      let orderDate = new Date();
      let deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 5);

      let orderObj = {
        deliveryDetails: {
          name: order.name,
          address: order.address,
          phone: order.phone,
          pincode: order.pincode,
        },
        userId: new ObjectId(order.userId),
        paymentMethod: order.paymentMethod,
        products: products.map((p) => ({
          item: p.item,
          quantity: p.quantity,
          name: p.product.name,
          price: p.product.price,
          subtotal: p.subtotal,
        })),
        totalAmount: total,
        status: "Placed",
        date: orderDate,
        deliveryDate: deliveryDate,
      };

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then(() => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: new ObjectId(order.userId) });
          resolve();
        });
    });
  },

  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: new ObjectId(userId) })
        .sort({ date: -1 })
        .toArray();
      resolve(orders);
    });
  },

  returnOrder: (orderId, reason) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(orderId) },
          {
            $set: {
              status: "Return Requested",
              returnReason: reason,
              returnDate: new Date(),
            },
          },
        )
        .then(() => resolve());
    });
  },

  createRazorpayOrder: (total) => {
    return new Promise((resolve, reject) => {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const options = {
        amount: total * 100,
        currency: "INR",
        receipt: "receipt_" + Date.now(),
      };
      razorpay.orders.create(options, (err, order) => {
        if (err) reject(err);
        else resolve(order);
      });
    });
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(details.razorpay_order_id + "|" + details.razorpay_payment_id)
        .digest("hex");
      if (expectedSignature === details.razorpay_signature) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },

  getUserDetails: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: new ObjectId(userId) });
      resolve(user);
    });
  },

  updateProfile: (userId, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              name: data.name,
              email: data.email,
              phone: data.phone,
            },
          },
        )
        .then(() => resolve());
    });
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    let user = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) });

    let status = await bcrypt.compare(currentPassword, user.password);
    if (!status) return false;

    let hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .get()
      .collection(collection.USER_COLLECTION)
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { password: hashedPassword } },
      );
    return true;
  },

  addAddress: (userId, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(userId) },
          {
            $push: {
              addresses: {
                _id: new ObjectId(),
                name: data.name,
                phone: data.phone,
                address: data.address,
                pincode: data.pincode,
              },
            },
          },
        )
        .then(() => resolve());
    });
  },

  deleteAddress: (userId, addressId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: new ObjectId(userId) },
          {
            $pull: {
              addresses: {
                _id: new ObjectId(addressId),
              },
            },
          },
        )
        .then(() => resolve());
    });
  },
};
