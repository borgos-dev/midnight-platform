import { Router } from "express";

const router = Router();

// test endpoint
router.get("/health", (req, res) => {
    res.json({ ok: true });
});

export default router;
