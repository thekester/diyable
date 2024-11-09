# DIY Project Sharing Platform

## Overview

A platform for sharing and discovering Do It Yourself (DIY) projects, from crafts to tech innovations. Whether you enjoy woodworking, home improvement, or creative electronics, this is the place to get inspired and inspire others.

## Project Structure

```
diyable/
│
├── app.js
├── package.json
├── package-lock.json          # Generated automatically after `npm init -y`
├── Dockerfile
├── .dockerignore              
│
├── actions-runner/             # For the github workflow
├── bdd/
│   └── tavenel.db
├── views/
│   └── index.pug│
├── public/
│   └── code/
│       └── jquery.min.js
│   └── style/
│       └── index.css
│
│
└── node_modules/              # Generated automatically after `npm install`
```

## Setting Up the Project

1. **Create the Project Directories**:
```sh
   mkdir -p diyable/views
   mkdir -p diyable/public/code
```

2. **Add jQuery Library**: 
   - Download the jQuery file from: [jQuery 3.7.1](https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js) and save it in the `public/code/` directory.

3. **Initialize Node.js Project**:
```sh
   cd diyable/
   npm init -y
```

4. **Install Dependencies**:
```sh
   npm install express pug sqlite3 dotenv body-parser express-session
```

## Port Configuration in the .env
To use a specific address for the diyable app you can set the PORT var in the .env like that: PORT=5133 for example
With that you can easily set the address for the app in order to modify easily the port to avoid the following error Error: listen EADDRINUSE: address already in use :::5136

## Docker Configuration

1. **Build Docker Image**:
```sh
   docker build -t diyable .
```

2. **Run Docker Container**:
```sh
   docker run -d -p 5010:5010 --name diyable-container diyable
```

3. **Access the Container** (optional, for debugging or inspection):
```sh
   docker exec -it diyable-container /bin/bash
```

## Alternative Method with Docker Compose

1. **Build and Run Using Docker Compose**:
```sh
   docker-compose build
   docker-compose up -d
```

2. **View Logs**:
```sh
   docker-compose logs -f
```

## Simple Method to Start the Application
To avoid the error of Error: secret option required for sessions you need to run the following command
```sh
   echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env
```

1. **Run Node Application Directly**:
```sh
   node app.js
```

## Features

### User Accounts
- **Create and Share Projects**: Users can register to share tutorials, complete with images, materials, and detailed steps.
- **Follow Creators**: Follow other creators to get updates when they post new projects or updates.

### Privileged Accounts
- **Moderator Role**: Special users act as moderators who validate tutorials and highlight the most innovative or helpful projects.
- **Featured Projects**: Moderators can feature exceptional projects to give them more visibility.

### Comment Section
- **Interactive Discussions**: Users can leave comments to ask questions, provide suggestions, or offer improvements for each project.
- **Community Collaboration**: Encourage collaboration by allowing users to share their insights directly in the tutorial discussions.

### Customizable Themes
- **Personalized Layouts**: Users can choose their preferred layout style to make reading and following the instructions easier and more enjoyable.

### Guest Access
- **View-Only Mode**: Non-registered users can browse all tutorials, but they cannot leave comments or interact with creators.

### Tutorial Filtering System
- **Search and Filter by**:
  - **Material Type**: Find projects using specific materials like wood, electronics, or textiles.
  - **Category**: Filter projects by category such as *Home Decor*, *Electronics*, or *Gardening*.

### Rating System
- **Multi-Criteria Rating**:
  - **Star Ratings**: Rate projects from 1 to 5 stars based on their usefulness or creativity.
  - **Emoji Reactions**: Express your feelings with emoji-based reactions.
  - **Sorting Options**: Sort tutorials by criteria like *Most Relevant*, *Highest Rated*, or *Most Recent*.

## Getting Started
1. **Sign Up**: Create an account to share your projects, comment on others, and join the community.
2. **Explore Projects**: Use the filter system to find the projects that interest you the most.
3. **Connect**: Follow your favorite creators and participate in discussions to help improve projects.



## Example Branch Management

1. **Switch to Docker Environment Branch**:
```sh
   git checkout -b newbranch origin/newbranch
```
   
   This will set up a new branch `newbranch` that tracks `origin/newbranch`.

## Contribution
Feel free to contribute to the platform by:
- **Submitting your DIY projects**.
- **Providing suggestions** for new features or reporting issues.
- **Moderating** by applying to become a privileged account user.

## License
This project is licensed under the MIT License. See the `LICENSE` file for more details.

