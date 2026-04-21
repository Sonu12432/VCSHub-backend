const fs = require("fs").promises;
const path = require("path");

async function revertRepo(commitID) {
  const repoPath = path.resolve(process.cwd(), ".vcs");
  const commitsPath = path.join(repoPath, "commits");
  const commitDir = path.join(commitsPath, commitID);

  try {
    // Checking, does this commit actually exist locally?
    try {
      await fs.access(commitDir);
    } catch (err) {
      console.log(`Commit '${commitID}' not found locally.`);
      console.log(
        "Try running 'node index.js pull' to fetch it from the cloud first!",
      );
      return; // Stop the function here so it doesn't crash
    }

    // Setting up the target directory
    const parentDir = process.cwd();
    const files = await fs.readdir(commitDir);

    // Coping files back to the working directory
    for (const file of files) {
      // only for flat files, fs.cp(..., { recursive: true }) for recursive structure
      await fs.copyFile(path.join(commitDir, file), path.join(parentDir, file));
    }

    console.log(`Successfully reverted to commit ${commitID}!`);
  } catch (err) {
    console.error("Unable to revert:", err.message);
  }
}

module.exports = { revertRepo };
