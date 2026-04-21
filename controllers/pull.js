const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const os = require("os");

async function pullRepo() {
  const repoPath = path.resolve(process.cwd(), ".vcs");
  const commitsPath = path.join(repoPath, "commits");
  const configPath = path.join(repoPath, "config.json");

  try {
    // Getting the Repo ID from the local folder
    const configData = await fs.readFile(configPath, "utf-8");
    const { repoId } = JSON.parse(configData);

    // Getting the Auth Token
    const authPath = path.join(os.homedir(), ".vcshub-auth.json");
    const authData = await fs.readFile(authPath, "utf-8");
    const { token } = JSON.parse(authData);

    console.log("Pulling commits from VCSHub cloud...");

    // Asking the Express Backend for the files!
    const response = await axios.get(
      `http://localhost:3002/repo/${repoId}/pull`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const commits = response.data.commits;

    if (!commits || commits.length === 0) {
      console.log("No commits found in the cloud repository.");
      return;
    }

    // Reconstruct the hidden .vcs/commits folders locally
    for (const commit of commits) {
      const commitDir = path.join(commitsPath, commit.commitId);
      await fs.mkdir(commitDir, { recursive: true });

      const filePath = path.join(commitDir, commit.fileName);
      await fs.writeFile(filePath, commit.fileContent);
    }

    console.log(
      `Successfully pulled ${commits.length} files from the cloud!`,
    );
  } catch (err) {
    if (err.response) {
      console.error(`Pull failed: ${err.response.data.message}`);
    } else {
      console.error("Error pulling from VCSHub:", err.message);
    }
  }
}

module.exports = { pullRepo };
