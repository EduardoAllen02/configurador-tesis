const path = require("path");
const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const { uploadsDir, exportsDir } = require("./config/env");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.resolve(uploadsDir)));
app.use("/exports", express.static(path.resolve(exportsDir)));
app.use("/api", routes);

app.use(errorHandler);

module.exports = app;
