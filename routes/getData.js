import express from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";

const getDataRouter = express.Router();


getDataRouter.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("username");
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


getDataRouter.get("/checkdata", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("handle picture description links");
        if (!user) return res.status(404).json({ message: "No links found for this user." });
        
        res.status(200).json({ user });
    } catch (err) {
        console.error("Error while fetching user data:", err);
        res.status(500).json({ message: "Server error while fetching links." });
    }
});


getDataRouter.get("/profile/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select("handle picture description links");
        if (!user) return res.status(404).json({ message: "Profile not found" });

        res.status(200).json({ user });
    } catch (err) {
        console.error("Error while fetching profile:", err);
        res.status(500).json({ message: "Server error while fetching profile." });
    }
});

export default getDataRouter;
