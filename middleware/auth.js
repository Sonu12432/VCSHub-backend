require("dotenv").config();
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  // 1. Grab the token from the request header
  // Postman/React/CLI sends it as: "Authorization: Bearer <your_token_here>"
  const authHeader = req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied. No authentication token provided." });
  }

  // Extract the actual token string by splitting "Bearer <token>"
  const token = authHeader.split(" ")[1];

  try {
    // 2. Verify the token using your secret key
    // This checks if the token is real, hasn't expired, and wasn't tampered with.
    const verifiedUser = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // 3. Attach the decoded user payload to the request object
    // This is why we can do `req.user.id` inside our repoController!
    req.user = verifiedUser;

    // 4. Let the user pass through to the actual route controller
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token. Please log in again." });
  }
}

module.exports = authMiddleware;