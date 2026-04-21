const { s3, S3_BUCKET } = require("../config/aws-config");
const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");

async function handleCliPush(req, res) {
  try {
    // Grab data from the request
    const { id: repoId } = req.params; // From the URL: /repo/:id/push
    const { commits } = req.body; // From the Axios payload (express backend)

    // Grabbing the logged-in user's ID from your JWT Auth Middleware
    const userId = req.user.id || req.user._id;

    if (!commits || commits.length === 0) {
      return res
        .status(400)
        .json({ message: "No commits provided in payload." });
    }

    // Security Check: Does this repo exist, and does this user own it?
    const repo = await Repository.findById(repoId);

    if (!repo) {
      return res.status(404).json({ message: "Repository not found." });
    }

    if (repo.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message:
          "Unauthorized: You do not have permission to push to this repository.",
      });
    }

    // Upload to AWS S3 using the Dynamic Path!
    const updatedFiles = new Set(repo.content);

    console.log(`Receiving push for repo: ${repo.name}...`);

    for (const commit of commits) {
      const params = {
        Bucket: S3_BUCKET,
        // User -> Repo -> Commits -> CommitID -> File
        Key: `${userId}/${repoId}/commits/${commit.commitId}/${commit.fileName}`,
        Body: commit.fileContent,
        ContentType: "text/plain",
      };

      await s3.upload(params).promise();

      updatedFiles.add(commit.fileName);
    }

    // Updating MongoDB so the Frontend knows what files exist!
    repo.content = Array.from(updatedFiles); // Convert Set back to Array

    await repo.save();

    console.log(
      `Successfully uploaded ${commits.length} files to S3 for ${repo.name}`,
    );

    // Send success response back to the CLI
    res.status(200).json({
      message: "Successfully pushed to VCSHub!",
    });
  } catch (err) {
    console.error("Backend push error:", err);
    res.status(500).json({ message: "Server error during push to cloud." });
  }
}

async function handleCliPull(req, res) {
  try {
    const { id: repoId } = req.params;
    const userId = req.user.id || req.user._id;

    // Security Check: Does the user have access to this repo?
    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found." });
    }
    if (repo.owner.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized access." });
    }

    // Ask AWS S3 to list all files in this specific user/repo folder
    const prefix = `${userId}/${repoId}/commits/`;
    const s3Data = await s3
      .listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: prefix,
      })
      .promise();

    if (!s3Data.Contents || s3Data.Contents.length === 0) {
      return res.status(200).json({ commits: [] });
    }

    const commits = [];

    // Loop through the S3 objects and download the actual code
    for (const object of s3Data.Contents) {
      // userId/repoId/commits/commitId/filename.txt
      const keyParts = object.Key.split("/");
      const fileName = keyParts.pop(); // Gets 'filename.txt'
      const commitId = keyParts.pop(); // Gets 'commitId'

      // Fetch the raw text from S3
      const fileData = await s3
        .getObject({
          Bucket: S3_BUCKET,
          Key: object.Key,
        })
        .promise();

      commits.push({
        commitId: commitId,
        fileName: fileName,
        fileContent: fileData.Body.toString("utf-8"),
      });
    }

    // Send all the files back to the CLI
    res.status(200).json({ commits });
  } catch (err) {
    console.error("Backend pull error:", err);
    res.status(500).json({ message: "Server error during pull from cloud." });
  }
}

async function getFileContent(req, res) {
  try {
    const { id: repoId } = req.params;
    const { filename, commitId } = req.query;

    // Find the repo in MongoDB
    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found." });
    }

    // Security Check for Private Repos
    // If it's private, ensure the user requesting it is logged in AND is the owner (or collaborator)
    if (!repo.visibility) {
      const requestingUserId = req.user?.id || req.user?._id;
      if (
        !requestingUserId ||
        repo.owner.toString() !== requestingUserId.toString()
      ) {
        return res
          .status(403)
          .json({ message: "Unauthorized: This is a private repository." });
      }
    }

    // Fetching the file directly from AWS S3!
    const params = {
      Bucket: S3_BUCKET,
      // We reconstruct the exact dynamic path we used during the CLI Push!
      Key: `${repo.owner.toString()}/${repoId}/commits/${commitId}/${filename}`,
    };

    const s3Data = await s3.getObject(params).promise();

    // Convert the AWS Buffer stream back into a readable UTF-8 string
    const fileContent = s3Data.Body.toString("utf-8");

    // Sending the raw code back to React!
    res.json({
      filename: filename,
      content: fileContent,
    });
  } catch (err) {
    console.error("Error fetching file from S3:", err);

    // AWS returns 'NoSuchKey' if the file doesn't exist at that exact path
    if (err.code === "NoSuchKey") {
      return res
        .status(404)
        .json({ message: "File not found in this commit." });
    }

    res.status(500).json({ message: "Server error while fetching file." });
  }
}

async function createRepository(req, res) {
  const { owner, name, issues, content, description, visibility } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: "Repository name is required!" });
    }

    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({ error: "Invalid User ID!" });
    }

    const newRepository = new Repository({
      name,
      description,
      visibility,
      owner,
      content,
      issues,
    });

    const result = await newRepository.save();

    res.status(201).json({
      message: "Repository created!",
      repositoryID: result._id,
    });
  } catch (err) {
    console.error("Error during repository creation : ", err.message);
    res.status(500).send("Server error");
  }
}

async function getAllRepositories(req, res) {
  try {
    const repositories = await Repository.find({})
      .populate("owner")
      .populate("issues");

    res.json(repositories);
  } catch (err) {
    console.error("Error during fetching repositories : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoryById(req, res) {
  const { id } = req.params;
  try {
    // CHANGED: findById returns a single Object instead of an Array
    const repository = await Repository.findById(id)
      .populate("owner")
      .populate("issues");

    if (!repository) {
      return res.status(404).json({ message: "Repository not found" });
    }

    res.json(repository);
  } catch (err) {
    console.error("Error during fetching repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoryByName(req, res) {
  const { name } = req.params;
  try {
    const repository = await Repository.find({ name })
      .populate("owner")
      .populate("issues");

    res.json(repository);
  } catch (err) {
    console.error("Error during fetching repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoriesForCurrentUser(req, res) {
  console.log(req.params);
  const { userID } = req.params;

  try {
    const repositories = await Repository.find({ owner: userID });
    console.log(repositories);
    res
      .status(200)
      .json({ message: "Repositories fetched successfully!", repositories });
  } catch (err) {
    console.error("Error during fetching user repositories : ", err.message);
    res.status(500).send("Server error");
  }
}

async function updateRepositoryById(req, res) {
  const { id } = req.params;
  const { content, description } = req.body;

  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    repository.content.push(content);
    repository.description = description;

    const updatedRepository = await repository.save();

    res.json({
      message: "Repository updated successfully!",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during updating repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function toggleVisibilityById(req, res) {
  const { id } = req.params;

  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    repository.visibility = !repository.visibility;

    const updatedRepository = await repository.save();

    res.json({
      message: "Repository visibility toggled successfully!",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during toggling visibility : ", err.message);
    res.status(500).send("Server error");
  }
}

async function deleteRepositoryById(req, res) {
  const { id } = req.params;
  try {
    const repository = await Repository.findByIdAndDelete(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    res.json({ message: "Repository deleted successfully!" });
  } catch (err) {
    console.error("Error during deleting repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function toggleStar(req, res) {
  try {
    const { id: repoId } = req.params;
    const userId = req.user.id || req.user._id; // From your authMiddleware

    const repo = await Repository.findById(repoId);
    const user = await User.findById(userId);

    if (!repo || !user) {
      return res.status(404).json({ message: "Repository or User not found" });
    }

    // Check if the user has already starred this repo
    const isStarred = repo.stars.includes(userId);

    if (isStarred) {
      repo.stars.pull(userId);      // removing userId from the stars in repo model
      user.starredRepos.pull(repoId);       // removing the repoId from the starredRepos array in User model
    } else {
      // STAR: Add IDs to both arrays
      repo.stars.push(userId);
      user.starredRepos.push(repoId);
    }

    await repo.save();
    await user.save();

    res.json({ 
      message: isStarred ? "Unstarred!" : "Starred!", 
      totalStars: repo.stars.length 
    });

  } catch (err) {
    console.error("Error toggling star:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  handleCliPush,
  handleCliPull,
  getFileContent,
  createRepository,
  getAllRepositories,
  fetchRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  toggleStar,
};
