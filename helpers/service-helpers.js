var db = require("../config/connection");
var collection = require("../config/collections");
const { ObjectId } = require("mongodb");

module.exports = {
  // CREATE BOOKING
  createBooking: (userId, data) => {
    return new Promise((resolve, reject) => {
      let bookingObj = {
        userId: new ObjectId(userId),

        customerName: data.customerName,
        phone: data.phone,

        deviceBrand: data.deviceBrand,
        deviceModel: data.deviceModel,

        serviceType: data.serviceType,
        problem: data.problem,

        preferredDate: data.preferredDate,
        timeSlot: data.timeSlot,

        visitType: data.visitType,

        address: data.visitType === "Pickup" ? data.address : "",

        // ✅ SAVE LOCATION
        latitude: data.latitude || "",
        longitude: data.longitude || "",

        status: "Pending",
        estimatedCost: 0,

        date: new Date(),
      };

      db.get()
        .collection(collection.SERVICE_COLLECTION)
        .insertOne(bookingObj)
        .then((data) => {
          resolve(data.insertedId);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  // USER BOOKINGS
  getUserBookings: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.SERVICE_COLLECTION)
        .find({
          userId: new ObjectId(userId),
        })
        .sort({ date: -1 })
        .toArray()
        .then((bookings) => {
          resolve(bookings);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  // ADMIN ALL BOOKINGS
  getAllBookings: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.SERVICE_COLLECTION)
        .find()
        .sort({ date: -1 })
        .toArray()
        .then((bookings) => {
          resolve(bookings);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  // SINGLE BOOKING
  getBookingDetails: (bookingId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.SERVICE_COLLECTION)
        .findOne({
          _id: new ObjectId(bookingId),
        })
        .then((booking) => {
          resolve(booking);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  // UPDATE STATUS
  updateBookingStatus: (bookingId, status, estimatedCost) => {
    return new Promise((resolve, reject) => {
      let updateFields = {
        status: status,
      };

      if (estimatedCost !== undefined && estimatedCost !== "") {
        updateFields.estimatedCost = Number(estimatedCost);
      }

      db.get()
        .collection(collection.SERVICE_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(bookingId),
          },
          {
            $set: updateFields,
          },
        )
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  // CANCEL BOOKING
  cancelBooking: (bookingId, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.SERVICE_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(bookingId),
            userId: new ObjectId(userId),
          },
          {
            $set: {
              status: "Cancelled",
            },
          },
        )
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  // ✅ PENDING COUNT
  getPendingBookingCount: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.SERVICE_COLLECTION)
        .countDocuments({
          status: "Pending",
        })
        .then((count) => {
          resolve(count);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
};
