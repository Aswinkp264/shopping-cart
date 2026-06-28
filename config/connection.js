const { MongoClient } = require("mongodb");

const state = {
  db: null,
};

module.exports.connect = async function (done) {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    state.db = client.db(process.env.DB_NAME);

    console.log("✅ MongoDB Connected");

    done();
  } catch (err) {
    console.log(err);
    done(err);
  }
};

module.exports.get = function () {
  if (!state.db) {
    throw new Error("Database not connected");
  }

  return state.db;
};
