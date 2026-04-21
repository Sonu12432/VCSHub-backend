const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require('../middleware/auth'); // Your JWT checker - the user has to login first and express backend checks it before running the controller

const repoRouter = express.Router();

repoRouter.post("/repo/create", repoController.createRepository);
repoRouter.put("/repo/update/:id", authMiddleware, repoController.updateRepositoryById);
repoRouter.delete("/repo/delete/:id", authMiddleware, repoController.deleteRepositoryById);
repoRouter.patch("/repo/toggle/:id", authMiddleware, repoController.toggleVisibilityById);
repoRouter.post("/repo/:id/star", authMiddleware, repoController.toggleStar);

repoRouter.get("/repo/all", repoController.getAllRepositories);
repoRouter.get("/repo/:id", repoController.fetchRepositoryById);
repoRouter.get("/repo/name/:name", repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", repoController.fetchRepositoriesForCurrentUser);
repoRouter.get("/repo/:id/file", repoController.getFileContent);

// CLI Route (Secured by authMiddleware)
repoRouter.post("/repo/:id/push", authMiddleware, repoController.handleCliPush);
repoRouter.get("/repo/:id/pull", authMiddleware, repoController.handleCliPull);

module.exports = repoRouter;