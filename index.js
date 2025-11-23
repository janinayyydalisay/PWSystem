import express from "express";
import path from "path";
import session from "express-session";
import router from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

const automationRoutes = require('./routes/automationRoutes');
app.use('/automation', automationRoutes);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: "xianfire-secret-key",
  resave: false,
  saveUninitialized: false
}));

app.engine("xian", (filePath, options, callback) => {
  import("fs").then(fs => {
    fs.readFile(filePath, (err, content) => {
      if (err) return callback(err);
      return callback(null, content.toString());
    });
  });
});

app.set("views", path.join(process.cwd(), "views"));
app.set("view engine", "xian");

app.use("/", router);

app.listen(PORT, "0.0.0.0", () => console.log(`🔥 XianFire running at http://0.0.0.0:${PORT}`));
