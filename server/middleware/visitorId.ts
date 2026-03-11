import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export function ensureVisitorId(req: Request, res: Response, next: NextFunction) {
    const r = req as Request & { cookies?: Record<string, string> };
    const vid = r.cookies?.vid;

    if (!vid) {
        res.cookie("vid", randomUUID(), {
            httpOnly: true, // recommended for identifier/session-like cookies [web:98]
            sameSite: "lax", // helps reduce CSRF risk [web:98]
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year
        });
    }

    next();
}
