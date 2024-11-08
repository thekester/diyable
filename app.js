require('dotenv').config(); // Charger les variables d'environnement depuis .env
const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3
const fs = require('fs');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Mettez à true si vous utilisez HTTPS
}));

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
    const createTableProjetQuery = `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        image TEXT
      )
    `;
    const createTableUsersQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        salt TEXT
      )
    `;

    db.run(createTableProjetQuery, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table projet:', err.message);
      } else {
        console.log('Table "projects" créée ou déjà existante.');
        // Vérifier et insérer des données initiales si nécessaire
        checkAndInsertInitialProjetData();
      }
    });
    db.run(createTableUsersQuery, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table users:', err.message);
      } else {
        console.log('Table "users" créée ou déjà existante.');
        // Vérifier et insérer des données initiales si nécessaire
      }
    });
  }
});

// Fonction pour vérifier si la table est vide et insérer des données initiales
const checkAndInsertInitialProjetData = () => {
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
      res.render('index', { title: 'Accueil', username: req.session.username, recentProjects: rows });
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

// Route pour afficher la page de connexion
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Fonction pour chiffrer le mot de passe avec SHA-512 et un sel
function hashPassword(password, salt) {
  const hash = crypto.createHmac('sha512', salt); // Utilise SHA-512 avec le sel
  hash.update(password);
  return hash.digest('hex');
}

// Génération d'un sel unique
function generateSalt(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validation des entrées
  if (!username || !password) {
    return res.status(400).send('Tous les champs sont requis');
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) {
      res.status(500).send('Erreur du serveur');
    } else if (row) {
      // Utilisateur trouvé, vérification du mot de passe
      const hashedPassword = hashPassword(password, row.salt);
      if (hashedPassword === row.password) {
        // Stocker l'utilisateur dans la session
        req.session.username = username;
        res.redirect('/');
      } else {
        res.status(401).send('Mot de passe incorrect');
      }
    } else {
      res.status(404).send('Utilisateur non trouvé');
    }
  });
});

// Route pour afficher le formulaire de création de compte
app.get('/register', (req, res) => {
  const { username } = req.query;
  res.render('register', { title: 'Créer un compte', username });
});

// Route pour la création de compte
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  // Validation des entrées
  if (!username || !email || !password) {
    return res.status(400).send('Tous les champs sont requis');
  }

  const salt = generateSalt();
  const hashedPassword = hashPassword(password, salt);

  // Insertion de l'utilisateur dans la base de données
  db.run(`INSERT INTO users (username, email, password, salt) VALUES (?, ?, ?, ?)`, [username, email, hashedPassword, salt], function(err) {
    if (err) {
      console.error('Erreur lors de l\'insertion :', err);
      if (err.code === 'SQLITE_CONSTRAINT') {
        res.status(409).send('Nom d\'utilisateur ou email déjà pris');
      } else {
        res.status(500).send('Erreur du serveur');
      }
    } else {
      res.send('Compte créé avec succès');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Erreur lors de la déconnexion');
    }
    res.redirect('/'); // Rediriger vers la page d'accueil après déconnexion
  });
});

// Démarrage du serveur avec port configurable via variable d'environnement
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});