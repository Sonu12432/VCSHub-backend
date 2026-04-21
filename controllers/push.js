const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".vcs");
  const commitsPath = path.join(repoPath, "commits");
  const configPath = path.join(repoPath, "config.json");

  try {
    // Get the Repo ID
    // Assuming when you ran 'vcs init' or cloned the repo, you saved the MongoDB repoId 
    // into a local .vcs/config.json file so the CLI knows which repo it is working in.
    let repoConfig;
    try {
      const configData = await fs.readFile(configPath, "utf-8");
      repoConfig = JSON.parse(configData);    // file contained repoId
    } catch (err) {
      console.error("Error: Could not find .vcs/config.json. Is this a VCSHub repository?");
      return;
    }

    const repoId = repoConfig.repoId;

    // Get the User's Auth Token
    // In a real CLI, when a user types 'vcs login', we'll save their JWT to a global file on their computer (e.g., ~/.vcshub-auth.json)
    const tokenPath = path.join(require('os').homedir(), '.vcshub-auth.json');
    let token;
    try {
      const authData = await fs.readFile(tokenPath, "utf-8");
      token = JSON.parse(authData).token;
    } catch (err) {
      console.error("Error: You are not logged in. Please run 'vcs login' first.");
      return;
    }

    console.log("Packaging commits for push...");

    // Reading all commits and files into an array
    const commitsData = [];
    const commitDirs = await fs.readdir(commitsPath);

    for (const commitDir of commitDirs) {
      const commitPath = path.join(commitsPath, commitDir);
      
      const stat = await fs.stat(commitPath);
      if (stat.isDirectory()) {         // Ensure it's a directory
        const files = await fs.readdir(commitPath);

        for (const file of files) {
          const filePath = path.join(commitPath, file);
          
          // Reading the file as a UTF-8 string so it can be sent via JSON
          const fileContent = await fs.readFile(filePath, "utf-8"); 

          commitsData.push({
            commitId: commitDir,
            fileName: file,
            fileContent: fileContent
          });
        }
      }
    }

    if (commitsData.length === 0) {
      console.log("No new commits to push.");
      return;
    }

    console.log(`Pushing ${commitsData.length} files to VCSHub...`);

    // Sending the payload to the Express Backend
    const response = await axios.post(
      `http://localhost:3002/repo/${repoId}/push`, 
      { commits: commitsData },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("✅", response.data.message);

  } catch (err) {
    // Handling Axios backend errors
    if (err.response) {
      console.error(`Push failed: ${err.response.data.message}`);
    } else {
      console.error("Error pushing to VCSHub:", err.message);
    }
  }
}

module.exports = { pushRepo };