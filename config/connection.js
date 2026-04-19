const { MongoClient } = require("mongodb");

const state = {
  db: null,
};

module.exports.connect = async function (done) {
  const url = "mongodb://127.0.0.1:27017";
  const dbname = "shopping";

  try {
    const client = await MongoClient.connect(url);
    state.db = client.db(dbname);
    // console.log("MongoDB Connected");
    done();
  } catch (err) {
    done(err);
  }
};

module.exports.get = function () {
  return state.db;
};
