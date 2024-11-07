// app.js

require('dotenv').config(); // Charger les variables d'environnement depuis .env
const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3
const fs = require('fs');

// Pour servir des fichiers statiques (comme le CSS, le JavaScript)
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'assets', 'images'))); // Serve images

// Middleware pour parser les requêtes POST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration du moteur de template (Pug)
app.set('view engine', 'pug');
app.set('views', './views');

// Connexion à la base de données SQLite
const dbPath = path.join(__dirname, 'bdd', 'diyable.db');
console.log(`Chemin de la base de données: ${dbPath}`);

// Assurez-vous que le dossier 'bdd' existe
const bddDir = path.join(__dirname, 'bdd');
if (!fs.existsSync(bddDir)){
    fs.mkdirSync(bddDir, { recursive: true });
}

// Assurez-vous que le dossier 'assets/images' existe
const imagesDir = path.join(__dirname, 'assets', 'images');
if (!fs.existsSync(imagesDir)){
    fs.mkdirSync(imagesDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
    process.exit(1); // Arrêter le serveur si la connexion échoue
  } else {
    console.log('Connecté à la base de données SQLite.');

    // Créer la table des projets si elle n'existe pas
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        image TEXT
      )
    `;

    db.run(createTableQuery, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table:', err.message);
      } else {
        console.log('Table "projects" créée ou déjà existante.');
        // Vérifier et insérer des données initiales si nécessaire
        checkAndInsertInitialData();
      }
    });
  }
});

// Fonction pour vérifier si la table est vide et insérer des données initiales
const checkAndInsertInitialData = () => {
  const countQuery = `SELECT COUNT(*) as count FROM projects`;
  db.get(countQuery, [], (err, row) => {
    if (err) {
      console.error('Erreur lors du comptage des projets:', err.message);
      return;
    }

    if (row.count === 0) {
      console.log('La table "projects" est vide. Insertion des données initiales.');

      const insertQuery = `
        INSERT INTO projects (date, name, description, category, image)
        VALUES
          ('2024-11-05', 'Projet IoT Exemple', 'Découvrez comment ce projet IoT peut transformer votre quotidien.', 'iot', 'projet-iot-exemple.jpg'),
          ('2024-11-06', 'Projet Artisanat Exemple', 'Un projet de bricolage pour ajouter une touche personnelle à votre maison.', 'craft', 'projet-artisanat-exemple.jpg')
      `;

      db.run(insertQuery, function(err) {
        if (err) {
          console.error('Erreur lors de l\'insertion des projets initiaux:', err.message);
        } else {
          console.log(`Insérés ${this.changes} projets initiaux.`);
        }
      });
    } else {
      console.log('La table "projects" contient déjà des données.');
    }
  });
};

// Route principale
app.get('/', (req, res) => {
  // Récupérer les deux projets les plus récents
  const recentProjectsQuery = `
    SELECT * FROM projects
    ORDER BY date DESC
    LIMIT 2
  `;

  db.all(recentProjectsQuery, [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des projets récents:', err.message);
      res.status(500).send('Erreur serveur');
    } else {
      res.render('index', { title: 'Accueil', recentProjects: rows });
    }
  });
});

// Route Contact
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact' });
});

// Route pour les projets
app.get('/projets', (req, res) => {
  const query = `SELECT * FROM projects ORDER BY date DESC`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des projets:', err.message);
      res.status(500).send('Erreur serveur');
    } else {
      res.render('projets', { title: 'Projets', projects: rows });
    }
  });
});

// Route pour le détail d'un projet
app.get('/projets/:id', (req, res) => {
  const projectId = req.params.id;
  const query = `SELECT * FROM projects WHERE id = ?`;

  db.get(query, [projectId], (err, project) => {
    if (err) {
      console.error('Erreur lors de la récupération du projet:', err.message);
      res.status(500).send('Erreur serveur');
    } else if (!project) {
      res.status(404).send('Projet non trouvé');
    } else {
      res.render('projectDetail', { title: project.name, project });
    }
  });
});

// Démarrage du serveur avec port configurable via variable d'environnement
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
