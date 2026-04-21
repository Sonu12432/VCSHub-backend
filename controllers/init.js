// init - to initialize a new git repository with it's repoId. It will create a hidden folder like (.git) and initialize another subfolder in it namely (commits).

const fs = require("fs").promises;
const path = require("path");

async function initRepo(repoId) {
  const repoPath = path.resolve(process.cwd(), ".vcs");
  const commitsPath = path.join(repoPath, "commits");
  const configPath = path.join(repoPath, "config.json");

  try {
    await fs.mkdir(repoPath, { recursive: true });
    await fs.mkdir(commitsPath, { recursive: true });

    const configData = { repoId: repoId };
    await fs.writeFile(configPath, JSON.stringify(configData, null, 2));

    console.log("Repository initialised!");
    console.log(`Linked to Cloud Repository ID: ${repoId}`);
  } catch (err) {
    console.error("Error initialising repository", err);
  }
}

module.exports = { initRepo };
