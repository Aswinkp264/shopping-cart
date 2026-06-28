const { MongoClient } = require("mongodb");

const state = {
  db: null,
};

module.exports.connect = async function (done) {
  const url = process.env.MONGODB_URI;
  const dbname = process.env.DB_NAME;

  try {
    const client = await MongoClient.connect(url);
    state.db = client.db(dbname);
    console.log("✅ MongoDB Connected");
    done();
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    done(err);
  }
};

module.exports.get = function () {
  return state.db;
};
