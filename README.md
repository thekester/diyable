# DIY Project Sharing Platform

## Demo
https://www.youtube.com/watch?v=9aLlv0VMlj4

## Overview

A platform for sharing and discovering Do It Yourself (DIY) projects, from crafts to tech innovations. Whether you enjoy woodworking, home improvement, or creative electronics, this is the place to get inspired and inspire others.

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
   npm install express pug sqlite3 dotenv body-parser express-session multer csurf express-validator
```

## Configuration in the .env
To use a specific address for the diyable app you can set the PORT var in the .env like that: PORT=5133 for example
With that you can easily set the address for the app in order to modify easily the port to avoid the following error Error: listen EADDRINUSE: address already in use :::5136

```txt
PORT=<Your_PORT>>
SESSION_SECRET=<Your_SESSION_SECRET>

ADMIN_USERNAME=<Your_ADMIN_USERNAME>
ADMIN_PASSWORD=<Your_ADMIN_PASSWORD>
ADMIN_EMAIL=<Your_ADMIN_EMAIL>
```

if you don't create the .env you got a warning like that: Les informations de l'admin ne sont pas entièrement définies dans les variables d'environnement.
And you can't have access to the admin account because the script use the .env to create the admin account.

To avoid the error of Error: secret option required for sessions you need to run the following command
```sh
   echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env
```
You can run this command only once and keep your session secret in the .env file.


## Start the Application

1. **Run Node Application Directly**:
```sh
   node app.js
```

## Schéma de la Base de Données

![database graphs](assets/images/diyable-dbv2.png)

> This graph was made using [ChartDB](https://chartdb.io/).


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
   docker compose build
   docker compose up -d
```

2. **View Logs**:
```sh
   docker compose logs -f
```


## Features

### User Accounts
- **Create and Share Projects**: Users can register to share tutorials, complete with images, materials, and detailed steps.
- **Follow Creators**: Follow other creators to get updates when they post new projects or updates.

### Privileged Accounts
- **Moderator Role**: Special users act as moderators who validate tutorials and highlight the most innovative or helpful projects.
- **Featured Projects**: Moderators can feature exceptional projects to give them more visibility.

### Guest Access
- **View-Only Mode**: Non-registered users can browse all tutorials, but they cannot leave comments or interact with creators.

### Comment Section
- **Interactive Discussions**: Users can leave comments to ask questions, provide suggestions, or offer improvements for each project.
- **Community Collaboration**: Encourage collaboration by allowing users to share their insights directly in the tutorial discussions.

### Customizable Themes (Dark mode)
- **Personalized Layouts**: Users can choose their preferred layout style to make reading and following the instructions easier and more enjoyable.

### Tutorial Filtering System
- **Search and Filter by**:
  - **Material Type**: Find projects using specific materials like wood, electronics, or textiles.
  - **Category**: Filter projects by category such as *Home Decor*, *Electronics*, or *Gardening*.


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

