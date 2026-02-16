var db = require("../config/connection");

module.exports = {
  addProduct: (product, callback) => {
    db.get()
      .collection("product")
      .insertOne(product)
      .then((data) => {
        console.log("Inserted ID:", data.insertedId);
        callback(data.insertedId); // ✅ correct
      })
      .catch((err) => {
        console.log(err);
      });
  },
};
