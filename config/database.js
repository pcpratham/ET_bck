const mongoose = require("mongoose");
require("dotenv").config();

exports.connect = () => {
  mongoose
    .connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("DB connection established");
    })
    .catch((err) => {
      console.log("DB connection error");
      console.log("err", err);
      process.exit(1);
    });
};
