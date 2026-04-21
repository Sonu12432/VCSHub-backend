const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const readline = require("readline");

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function loginUser() {
  console.log("Welcome to VCSHub CLI. Please log in.");

  try {
    // Getting credentials from the terminal
    const email = await prompt("Email: ");
    const password = await prompt("Password: "); 

    console.log("Authenticating...");

    // Hitting the Express backend login route
    const loginResponse = await axios.post("http://localhost:3002/login", {
      email: email,
      password: password,
    });

    const { token, userId } = loginResponse.data;

    // Save the token to the user's home directory
    const authPath = path.join(os.homedir(), ".vcshub-auth.json");   // i am saving the token in the user's local system in the file named ".vcshub-auth.json"
    await fs.writeFile(
      authPath,
      JSON.stringify({ token, userId }, null, 2),
      "utf-8"
    );

    console.log("Successfully logged in!");

    // FETCH AND DISPLAY REPOSITORIES
    console.log("\nFetching your cloud repositories...");
    
    try {
      const repoResponse = await axios.get(`http://localhost:3002/repo/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Extracting the array depending on how the backend sends it
      let repos = repoResponse.data;
      
      if (repos && repos.repositories) {
        repos = repos.repositories;
      } else if (repos && repos.data) {
        repos = repos.data; 
      }

      // Verify that 'repos' is actually an array before we try to loop over it
      if (!Array.isArray(repos) || repos.length === 0) {
        console.log("\nYou don't have any repositories yet.");
        console.log("Go to http://localhost:5173 to create one first!");
      } else {
        console.log("\n========================================");
        console.log("          YOUR REPOSITORIES             ");
        console.log("========================================");
        
        repos.forEach((repo) => {
          console.log(`Name : ${repo.name}`);
          console.log(`ID   : ${repo._id || repo.id}`); 
          console.log("----------------------------------------");
        });

        console.log("\nTo link a repository to this folder, copy an ID above and run:");
        console.log("node index.js init <ID>");
      }

    } catch (repoErr) {
      console.log("Logged in, but could not display repositories.");
      console.error("Error details:", repoErr.message); 
    }

  } catch (err) {
    if (err.response) {
      console.error("Login failed:", err.response.data.message || err.response.statusText);
    } else {
      console.error("Could not connect to the VCSHub server. Is it running?");
    }
  }
}

module.exports = { loginUser };