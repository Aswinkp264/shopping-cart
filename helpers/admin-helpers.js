var db = require("../config/connection");
var collection = require("../config/collections");
const { ObjectId } = require("mongodb");

module.exports = {
  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $lookup: {
              from: collection.USER_COLLECTION,
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $addFields: {
              user: { $arrayElemAt: ["$user", 0] },
            },
          },
          {
            $sort: { date: -1 },
          },
        ])
        .toArray();
      resolve(orders);
    });
  },
  updateOrderStatus: (orderId, status) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne({ _id: new ObjectId(orderId) }, { $set: { status: status } })
        .then(() => resolve());
    });
  },
  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      resolve(users);
    });
  },
  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: new ObjectId(userId) }, { $set: { blocked: true } })
        .then(() => resolve());
    });
  },
  unblockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: new ObjectId(userId) }, { $set: { blocked: false } })
        .then(() => resolve());
    });
  },
  // 👈 ADDED
  getDashboardStats: () => {
    return new Promise(async (resolve, reject) => {
      let totalUsers = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .countDocuments();

      let totalProducts = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .countDocuments();

      let totalOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .countDocuments();

      let revenueResult = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: { $toDouble: "$totalAmount" } },
            },
          },
        ])
        .toArray();

      let totalRevenue =
        revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

      let pendingOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .countDocuments({ status: "Placed" });

      let shippedOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .countDocuments({ status: "Shipped" });

      let deliveredOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .countDocuments({ status: "Delivered" });

      let cancelledOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .countDocuments({ status: "Cancelled" });

      let recentOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $lookup: {
              from: collection.USER_COLLECTION,
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $addFields: {
              user: { $arrayElemAt: ["$user", 0] },
            },
          },
          { $sort: { date: -1 } },
          { $limit: 5 },
        ])
        .toArray();

      resolve({
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        recentOrders,
      });
    });
  },
};
