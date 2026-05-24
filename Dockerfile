# 1. Grab a lightweight, official Node.js image (Linux-based)
FROM node:20-alpine

# 2. Tell Docker to do all following actions inside this /app folder
WORKDIR /app

# 3. Copy ONLY the package files first (this makes future builds much faster)
COPY package*.json ./

# 4. Install the dependencies inside the container
RUN npm install

# 5. Copy the rest of your backend code into the container
COPY . .

# 6. The sticky note for local developers
EXPOSE 3000

# 7. The command to start your CLI/Server
CMD ["node", "index.js", "start"]