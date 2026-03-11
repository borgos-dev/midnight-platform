import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { ensureVisitorId } from "./middleware/visitorId";

const app = express();

app.set("trust proxy", 1);

app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());
app.use(ensureVisitorId);

app.use(
    "/api",
    rateLimit({
        windowMs: 60 * 1000,
        limit: 60,
        standardHeaders: "draft-8",
        legacyHeaders: false,
    })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(4000, () => {
    console.log("API running on http://localhost:4000/api/health");
});
