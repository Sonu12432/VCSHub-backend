const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

const userRouter = express.Router();

userRouter.post("/signup", userController.signup);
userRouter.post("/login", userController.login);
userRouter.get("/allUsers", userController.getAllUsers);
userRouter.get("/userProfile/:id", userController.getUserProfile);
userRouter.put("/updateProfile/:id", userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", userController.deleteUserProfile);
userRouter.get("/user/starred", authMiddleware, userController.getStarredRepos)

module.exports = userRouter;
