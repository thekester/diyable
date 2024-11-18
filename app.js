// app.js

require('dotenv').config(); // Charger les variables d'environnement depuis .env

const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const multer = require('multer');
const csrf = require('csurf'); // Protection contre les attaques CSRF
const { body, validationResult } = require('express-validator'); // Validation des entrées utilisateur

// Configuration de la session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'votre_secret_par_defaut', // Assurez-vous de définir SESSION_SECRET dans .env
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Mettez à true si vous utilisez HTTPS
  })
);

// Middleware pour le parsing du corps des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pour servir des fichiers statiques (comme le CSS, le JavaScript)
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'assets', 'images'))); // Servir les images
app.use('/learn', express.static(path.join(__dirname, 'views', 'learn'))); // Servir les images
app.use('/shop', express.static(path.join(__dirname, 'views', 'shop'))); // Servir les images


// Configuration du moteur de template (Pug)
app.set('view engine', 'pug');
app.set('views', './views');

app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts'))); // Servir les polices

// Middleware pour ajouter le nom d'utilisateur et le jeton CSRF aux variables locales
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  next();
});

// Initialiser le middleware CSRF
const csrfProtection = csrf({
  cookie: false, // Si vous n'utilisez pas de cookie pour le jeton CSRF
  value: (req) => {
    return req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
  },
});


// Fonction pour appliquer le middleware CSRF et ajouter le jeton CSRF aux variables locales
function csrfMiddleware(req, res, next) {
  csrfProtection(req, res, function (err) {
    if (err) {
      return next(err);
    }
    res.locals.csrfToken = req.csrfToken();
    next();
  });
}

// Middleware pour gérer les erreurs de jeton CSRF
app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);

  console.error('Jeton CSRF invalide:', err);

  const errorMessage =
    'Votre session a expiré ou est invalide. Veuillez recharger la page et réessayer.';

  // Vérifier si la requête est vers une route API
  if (req.path.startsWith('/comments') || req.path.startsWith('/react') || req.path.startsWith('/projets')) {
    res.status(403).json({
      success: false,
      message: errorMessage,
    });
  } else {
    res.status(403).render('csrfError', {
      title: 'Erreur de sécurité',
      message: errorMessage,
    });
  }
});


// Configuration de multer pour les téléchargements de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // Dossier pour les téléchargements
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de taille de fichier de 5MB
  },
  fileFilter: function (req, file, cb) {
    // Vérifier le type de fichier
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées.'));
    }
  },
});

// Assurez-vous que le dossier 'public/uploads' existe
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir le dossier uploads
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Connexion à la base de données SQLite
const dbPath = path.join(__dirname, 'bdd', 'diyable.db');

// Assurez-vous que le dossier 'bdd' existe
const bddDir = path.join(__dirname, 'bdd');
if (!fs.existsSync(bddDir)) {
  fs.mkdirSync(bddDir, { recursive: true });
}

// Assurez-vous que le dossier 'assets/images' existe
const imagesDir = path.join(__dirname, 'assets', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Vérifier les permissions avant d'ouvrir la base de données
try {
  fs.accessSync(dbPath, fs.constants.W_OK);
  console.log('Le fichier de base de données est accessible en écriture.');
} catch (err) {
  console.error("Le fichier de base de données n'est pas accessible en écriture:", err.message);
  process.exit(1);
}

// Création des requêtes de création de tables avec les clés étrangères
const createTableUsersQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL
  )
`;

const createTableProjectsQuery = `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image TEXT,
    userId INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE(name, date, image)
  )
`;

const createTableCommentsQuery = `
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    comment TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`;

const createTableCommentReactionsQuery = `
  CREATE TABLE IF NOT EXISTS comment_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id),
    FOREIGN KEY (userId) REFERENCES users(id),
    UNIQUE (comment_id, userId, emoji)
  )
`;

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
    process.exit(1); // Arrêter le serveur si la connexion échoue
  } else {
    console.log('Connecté à la base de données SQLite.');

    // Activer les clés étrangères
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error("Erreur lors de l'activation des clés étrangères:", err.message);
        return;
      }

      // Création ou modification des tables
      db.serialize(() => {
        db.run(createTableUsersQuery, (err) => {
          if (err) {
            console.error('Erreur lors de la création de la table users:', err.message);
          } else {
            console.log('Table "users" créée ou déjà existante.');
          }
        });

        db.run(createTableProjectsQuery, (err) => {
          if (err) {
            console.error('Erreur lors de la création de la table projects:', err.message);
          } else {
            console.log('Table "projects" créée ou déjà existante.');
          }
        });

        db.run(createTableCommentsQuery, (err) => {
          if (err) {
            if (err.message.includes('duplicate column name: userId')) {
              console.log('La colonne userId existe déjà dans la table comments.');
            } else {
              console.error('Erreur lors de la création de la table comments:', err.message);
            }
          } else {
            console.log('Table "comments" créée ou déjà existante.');
          }
        });

        db.run(createTableCommentReactionsQuery, (err) => {
          if (err) {
            if (err.message.includes('duplicate column name: userId')) {
              console.log('La colonne userId existe déjà dans la table comment_reactions.');
            } else {
              console.error('Erreur lors de la création de la table comment_reactions:', err.message);
            }
          } else {
            console.log('Table "comment_reactions" créée ou déjà existante.');
          }
        });

        // Après avoir créé les tables
        addUserIdToProjectsTable();

        createAdminUser((err, adminUserId) => {
          if (err) {
            console.error("Erreur lors de la création de l'utilisateur admin:", err);
          } else {
            checkAndInsertInitialData(adminUserId);
          }
        });
      });
    });
  }
});

// Fonction pour ajouter la colonne userId à la table projects si elle n'existe pas
const addUserIdToProjectsTable = () => {
  db.all(`PRAGMA table_info(projects)`, (err, columns) => {
    if (err) {
      console.error('Erreur lors de la vérification des colonnes:', err.message);
      return;
    }

    const hasUserId = columns.some((col) => col.name === 'userId');

    if (!hasUserId) {
      // Ajouter la colonne userId avec la valeur par défaut 1 (admin)
      db.run(`ALTER TABLE projects ADD COLUMN userId INTEGER NOT NULL DEFAULT 1`, (err) => {
        if (err) {
          console.error("Erreur lors de l'ajout de la colonne userId:", err.message);
        } else {
          console.log('Colonne userId ajoutée à la table projects.');
        }
      });
    }
  });
};

// Fonction pour vérifier, recréer la table si nécessaire et insérer des données initiales
const checkAndInsertInitialData = (adminUserId) => {
  console.log('Vérification et insertion des données initiales.');

  // Vérifier si la contrainte UNIQUE est présente
  db.all(`PRAGMA index_list(projects)`, (err, indexes) => {
    if (err) {
      console.error('Erreur lors de la vérification des index:', err.message);
      return;
    }

    const hasUniqueConstraint =
      indexes && indexes.some((index) => index.origin === 'u' || index.unique === 1);

    if (!hasUniqueConstraint) {
      // Recréer la table avec la contrainte UNIQUE
      recreateProjectsTable(adminUserId);
    } else {
      // Procéder à l'insertion des données initiales
      insertInitialProjectsData(adminUserId);
    }
  });
};

const recreateProjectsTable = (adminUserId) => {
  db.serialize(() => {
    db.run(`ALTER TABLE projects RENAME TO projects_old`, (err) => {
      if (err) {
        console.error('Erreur lors du renommage de la table projects:', err.message);
        return;
      }
      console.log('Table projects renommée en projects_old.');

      db.run(createTableProjectsQuery, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la nouvelle table projects:', err.message);
          return;
        }
        console.log('Nouvelle table projects créée avec la contrainte UNIQUE.');

        db.run(
          `
          INSERT INTO projects (id, date, name, description, category, image, userId)
          SELECT id, date, name, description, category, image, userId
          FROM projects_old
          GROUP BY name, date, image
        `,
          function (err) {
            if (err) {
              console.error('Erreur lors de la copie des données:', err.message);
              return;
            }
            console.log(`Données copiées vers la nouvelle table projects. ${this.changes} lignes affectées.`);

            db.run(`DROP TABLE projects_old`, (err) => {
              if (err) {
                console.error('Erreur lors de la suppression de la table projects_old:', err.message);
                return;
              }
              console.log('Table projects_old supprimée.');
              // Insérer les données initiales
              insertInitialProjectsData(adminUserId);
            });
          }
        );
      });
    });
  });
};

const insertInitialProjectsData = (adminUserId) => {
  // Suppression des doublons existants
  const deleteDuplicatesQuery = `
    DELETE FROM projects
    WHERE rowid NOT IN (
      SELECT MIN(rowid)
      FROM projects
      GROUP BY name, date, image
    )
  `;

  db.run(deleteDuplicatesQuery, function (err) {
    if (err) {
      console.error('Erreur lors de la suppression des doublons:', err.message);
      return;
    }
    console.log(`Doublons supprimés. ${this.changes} enregistrements affectés.`);

    const projects = [
      { date: '2024-11-07', name: 'Projet IoT Innovant', description: 'Découvrez comment ce projet IoT peut transformer votre quotidien.', category: 'tech', image: 'images/projet-iot-exemple.jpg' },
      { date: '2024-11-06', name: 'Atelier de Bricolage', description: 'Un projet de bricolage pour embellir votre espace de vie.', category: 'craft', image: 'images/atelier-bricolage.jpg' },
      { date: '2024-11-03', name: 'Création d\'un Jardin Vertical', description: 'Fabriquez un jardin vertical pour votre balcon ou intérieur.', category: 'garden', image: 'images/jardin-vertical.jpg' },
      { date: '2024-11-01', name: 'Fabriquer sa Propre Table en Bois', description: 'Construisez une table en bois personnalisée pour votre maison.', category: 'woodwork', image: 'images/table-bois.jpg' },
      { date: '2024-10-29', name: 'Réaliser des Bougies Maison', description: 'Apprenez à créer des bougies naturelles avec vos propres parfums.', category: 'craft', image: 'images/bougies-maison.jpg' },
      { date: '2024-10-26', name: 'Robot Suiveur de Ligne', description: 'Assemblez un petit robot qui suit une ligne tracée au sol.', category: 'tech', image: 'images/robot-ligne.jpg' },
      { date: '2024-10-23', name: 'Peinture sur Tissu', description: 'Personnalisez vos vêtements avec des motifs peints à la main.', category: 'art', image: 'images/peinture-tissu.jpg' },
      { date: '2024-10-15', name: 'Lampe en Bouteille Recyclée', description: 'Transformez une bouteille en une lampe élégante.', category: 'recycle', image: 'images/lampe-bouteille.jpg' },
      { date: '2024-10-11', name: 'Étagère Murale DIY', description: 'Créez une étagère murale design avec des matériaux simples.', category: 'woodwork', image: 'images/etagere-murale.jpg' },
      { date: '2024-10-08', name: 'Fabriquer un Cerf-Volant', description: 'Construisez un cerf-volant pour profiter des journées venteuses.', category: 'craft', image: 'images/cerf-volant.jpg' },
      { date: '2024-10-04', name: 'Enceinte Bluetooth Maison', description: 'Assemblez votre propre enceinte Bluetooth portable.', category: 'tech', image: 'images/enceinte-bluetooth.jpg' },
      { date: '2024-10-01', name: 'Pots de Fleurs Peints', description: 'Donnez de la couleur à vos plantes avec des pots personnalisés.', category: 'art', image: 'images/pots-fleurs-peints.jpg' },
      { date: '2024-09-28', name: 'Horloge Murale en Vinyle', description: 'Recyclez de vieux disques vinyles en horloges murales.', category: 'recycle', image: 'images/horloge-vinyle.jpg' },
      { date: '2024-09-25', name: 'Fabriquer du Savon Naturel', description: 'Créez vos propres savons avec des ingrédients naturels.', category: 'craft', image: 'images/savon-naturel.jpg' },
      { date: '2024-09-21', name: 'Station Météo Connectée', description: 'Construisez une station météo avec un microcontrôleur.', category: 'tech', image: 'images/station-meteo.jpg' },
      { date: '2024-09-17', name: 'Décoration en Macramé', description: 'Apprenez l\'art du macramé pour décorer votre intérieur.', category: 'craft', image: 'images/macrame.jpg' },
      { date: '2024-09-14', name: 'Composteur de Jardin', description: 'Fabriquez un composteur pour recycler vos déchets organiques.', category: 'garden', image: 'images/composteur.jpg' },
      { date: '2024-09-11', name: 'Cadre Photo en Bois Recyclé', description: 'Créez des cadres photo uniques avec du bois récupéré.', category: 'recycle', image: 'images/cadre-photo.jpg' },
      { date: '2024-09-08', name: 'Coussins Personnalisés', description: 'Cousez des coussins avec des motifs et tissus de votre choix.', category: 'craft', image: 'images/coussins.jpg' },
      { date: '2024-09-03', name: 'Système d\'Arrosage Automatique', description: 'Installez un système pour arroser vos plantes automatiquement.', category: 'tech', image: 'images/arrosage-automatique.jpg' },
    ];

    const insertQuery = `
      INSERT INTO projects (date, name, description, category, image, userId)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(name, date, image) DO UPDATE SET
        description=excluded.description,
        category=excluded.category,
        userId=excluded.userId
    `;

    db.serialize(() => {
      const stmt = db.prepare(insertQuery);

      projects.forEach((project) => {
        stmt.run(
          [project.date, project.name, project.description, project.category, project.image, adminUserId],
          function (err) {
            if (err) {
              console.error("Erreur lors de l'insertion ou la mise à jour du projet:", err.message);
            }
          }
        );
      });

      stmt.finalize(() => {
        console.log('Insertion ou mise à jour des projets terminée.');
      });
    });
  });
};

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

// Fonction pour créer l'utilisateur admin s'il n'existe pas
const createAdminUser = (callback) => {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminUsername || !adminPassword || !adminEmail) {
    console.warn("Les informations de l'admin ne sont pas entièrement définies dans les variables d'environnement.");
    return callback(new Error("Informations d'admin manquantes"));
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [adminUsername], (err, row) => {
    if (err) {
      console.error("Erreur lors de la vérification de l'utilisateur admin:", err.message);
      return callback(err);
    }

    if (row) {
      console.log('Utilisateur admin déjà existant.');
      return callback(null, row.id);
    } else {
      const salt = generateSalt();
      const hashedPassword = hashPassword(adminPassword, salt);

      db.run(
        `INSERT INTO users (username, email, password, salt) VALUES (?, ?, ?, ?)`,
        [adminUsername, adminEmail, hashedPassword, salt],
        function (err) {
          if (err) {
            console.error("Erreur lors de la création de l'utilisateur admin:", err.message);
            return callback(err);
          } else {
            console.log('Utilisateur admin créé avec succès.');
            return callback(null, this.lastID);
          }
        }
      );
    }
  });
};

// Middleware pour vérifier si l'utilisateur est authentifié
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Middleware pour valider les entrées utilisateur
const validateProject = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du projet est requis.')
    .isLength({ max: 255 })
    .withMessage('Le nom du projet est trop long.'),
  body('description').trim().notEmpty().withMessage('La description est requise.'),
  body('category').trim().notEmpty().withMessage('La catégorie est requise.'),
];

// Routes

// Route principale
app.get('/', csrfMiddleware, (req, res) => {
  // Récupérer les deux projets les plus récents
  const recentProjectsQuery = `
    SELECT projects.*, users.username
    FROM projects
    JOIN users ON projects.userId = users.id
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
app.get('/contact', csrfMiddleware, (req, res) => {
  res.render('contact', { title: 'Contact' });
});

// Route À Propos
app.get('/about', csrfMiddleware, (req, res) => {
  res.render('about', { title: 'À Propos' });
});

// Route vers les conditions d'utilisation
app.get('/terms-of-service', csrfMiddleware, (req, res) => {
  res.render('terms-of-service', { title: "Conditions d'utilisation" });
});

// Route pour la politique de confidentialité
app.get('/privacy-policy', csrfMiddleware, (req, res) => {
  res.render('privacy-policy', { title: 'Politique de Confidentialité' });
});

// Route pour les mentions légales
app.get('/legal-info', csrfMiddleware, (req, res) => {
  res.render('legal-info', { title: 'Mentions Légales' });
});

// Route pour la politique d'accessibilité
app.get('/accessibility-policy', csrfMiddleware, (req, res) => {
  res.render('accessibility-policy', { title: 'Politique d\'accessibilité' });
});

// Route pour la politique de remboursement
app.get('/refund-policy', csrfMiddleware, (req, res) => {
  res.render('refund-policy', { title: 'Politique de remboursement' });
});

// Route pour l'affiliation
app.get('/affiliate', csrfMiddleware, (req, res) => {
  res.render('affiliate', { title: 'Affiliation' });
});

// Route pour le blog
app.get('/learn/blog', csrfMiddleware, (req, res) => {
  res.render('learn/blog', { title: 'Blog' });
});

// Route pour la faq
app.get('/learn/faq', csrfMiddleware, (req, res) => {
  res.render('learn/faq', { title: 'Faq' });
});

// Route pour our-story
app.get('/learn/our-story', csrfMiddleware, (req, res) => {
  res.render('learn/our-story', { title: 'Our story' });
});

// Route pour les tips tricks
app.get('/learn/tips-tricks', csrfMiddleware, (req, res) => {
  res.render('learn/tips-tricks', { title: 'Tips-tricks' });
});

// Route pour les tutorials
app.get('/learn/tutorials', csrfMiddleware, (req, res) => {
  res.render('learn/tutorials', { title: 'tutorials' });
});

// Route pour la page principale de la boutique
app.get('/shop', csrfMiddleware, (req, res) => {
  res.render('shop/index', { title: 'Boutique DIYable' });
});

// Route pour les Outils & Fournitures
app.get('/shop/tools', csrfMiddleware, (req, res) => {
  res.render('shop/tools', { title: 'Outils & Fournitures' });
});

// Route pour les Accessoires
app.get('/shop/accessories', csrfMiddleware, (req, res) => {
  res.render('shop/accessories', { title: 'Accessoires' });
});

// Route pour Tout le Magasin
app.get('/shop/all', csrfMiddleware, (req, res) => {
  res.render('shop/all', { title: 'Tout le Magasin' });
});

// Route pour les starters kits
app.get('/shop/starter-kits', csrfMiddleware, (req, res) => {
  res.render('shop/starter-kits', { title: 'Starter-kits' });
});

// Route pour les projets DIY
app.get('/shop/projects', csrfMiddleware, (req, res) => {
  res.render('shop/projects', { title: 'Projets DIY' });
});


// Route pour les projets
app.get('/projets', csrfMiddleware, (req, res) => {
  const query = `
    SELECT projects.*, users.username
    FROM projects
    JOIN users ON projects.userId = users.id
    ORDER BY date DESC
  `;
  const categoriesQuery = `SELECT DISTINCT category FROM projects`;

  db.serialize(() => {
    db.all(categoriesQuery, [], (err, categoryRows) => {
      if (err) {
        console.error('Erreur lors de la récupération des catégories:', err.message);
        res.status(500).send('Erreur serveur');
        return;
      }

      // Extraire les catégories et filtrer celles à exclure de "Autre"
      const categories = categoryRows
        .map((row) => row.category)
        .filter((cat) => cat && !['autre', 'other'].includes(cat.toLowerCase()));

      db.all(query, [], (err, projectRows) => {
        if (err) {
          console.error('Erreur lors de la récupération des projets:', err.message);
          res.status(500).send('Erreur serveur');
        } else {
          res.render('projets', {
            title: 'Projets',
            projects: projectRows,
            categories,
          });
        }
      });
    });
  });
});

// Route GET pour afficher le formulaire d'ajout de projet
app.get('/projets/ajouter', isAuthenticated, csrfMiddleware, (req, res) => {
  res.render('createProject', { title: 'Ajouter un Projet' });
});

// Route POST pour traiter la soumission du formulaire d'ajout de projet
app.post(
  '/projets/ajouter',
  isAuthenticated,
  upload.single('image'),
  csrfMiddleware,
  validateProject,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Renvoyer le formulaire avec les messages d'erreur
      return res.status(400).render('createProject', {
        title: 'Ajouter un Projet',
        errors: errors.array(),
      });
    }

    const { name, description, category } = req.body;
    const userId = req.session.userId;
    const date = new Date().toISOString();
    const image = req.file ? `uploads/${req.file.filename}` : null;

    const insertProjectQuery = `
      INSERT INTO projects (date, name, description, category, image, userId)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(insertProjectQuery, [date, name, description, category, image, userId], function (err) {
      if (err) {
        console.error("Erreur lors de l'insertion du projet:", err.message);
        return res.status(500).send("Erreur lors de l'ajout du projet.");
      } else {
        res.redirect(`/projets/${this.lastID}`);
      }
    });
  }
);

// Route pour le détail d'un projet
app.get('/projets/:id', csrfMiddleware, (req, res) => {
  const projectId = req.params.id;
  const userId = req.session.userId;
  const adminUsername = process.env.ADMIN_USERNAME;

  // Requête pour récupérer les détails du projet
  const projectQuery = `
    SELECT projects.*, users.username
    FROM projects
    JOIN users ON projects.userId = users.id
    WHERE projects.id = ?
  `;

  // Requête pour récupérer les commentaires liés à ce projet avec le username
  const commentsQuery = `
    SELECT comments.*, users.username
    FROM comments
    JOIN users ON comments.userId = users.id
    WHERE comments.projectId = ?
    ORDER BY comments.date DESC
  `;

  db.get(projectQuery, [projectId], (err, project) => {
    if (err) {
      console.error('Erreur lors de la récupération du projet:', err.message);
      return res.status(500).send('Erreur serveur');
    }

    if (!project) {
      return res.status(404).send('Projet non trouvé');
    }

    // Récupération des commentaires associés
    db.all(commentsQuery, [projectId], (err, comments) => {
      if (err) {
        console.error('Erreur lors de la récupération des commentaires:', err.message);
        return res.status(500).send('Erreur serveur');
      }

      if (comments.length === 0) {
        // Rendu de la vue sans commentaires
        return res.render('projectDetail', {
          title: project.name,
          project,
          comments: [],
          projectId,
          currentUserId: userId,
          adminUsername: adminUsername,
        });
      }

      const commentIds = comments.map((comment) => comment.id);

      // Récupération des réactions pour ces commentaires
      const reactionsQuery = `
        SELECT comment_id, emoji, COUNT(*) AS count
        FROM comment_reactions
        WHERE comment_id IN (${commentIds.map(() => '?').join(',')})
        GROUP BY comment_id, emoji
      `;

      db.all(reactionsQuery, commentIds, (err, reactions) => {
        if (err) {
          console.error('Erreur lors de la récupération des réactions:', err.message);
          return res.status(500).send('Erreur serveur');
        }

        // Associer les réactions aux commentaires
        const reactionsMap = {};
        reactions.forEach((reaction) => {
          if (!reactionsMap[reaction.comment_id]) {
            reactionsMap[reaction.comment_id] = {};
          }
          reactionsMap[reaction.comment_id][reaction.emoji] = reaction.count;
        });

        comments.forEach((comment) => {
          comment.reactions = reactionsMap[comment.id] || {};
        });

        // Rendu de la vue avec les données du projet et les commentaires
        res.render('projectDetail', {
          title: project.name,
          project,
          comments,
          projectId,
          currentUserId: userId,
          adminUsername: adminUsername,
        });
      });
    });
  });
});

// Route GET pour afficher le formulaire d'édition d'un projet
app.get('/projets/:id/edit', isAuthenticated, csrfMiddleware, (req, res) => {
  const projectId = req.params.id;
  const userId = req.session.userId;
  const adminUsername = process.env.ADMIN_USERNAME;

  const projectQuery = `
    SELECT projects.*, users.username
    FROM projects
    JOIN users ON projects.userId = users.id
    WHERE projects.id = ?
  `;

  db.get(projectQuery, [projectId], (err, project) => {
    if (err) {
      console.error('Erreur lors de la récupération du projet:', err.message);
      return res.status(500).send('Erreur serveur');
    }

    if (!project) {
      return res.status(404).send('Projet non trouvé');
    }

    if (userId !== project.userId && req.session.username !== adminUsername) {
      return res.status(403).send("Vous n'êtes pas autorisé à modifier ce projet.");
    }

    res.render('editProject', {
      title: 'Modifier le projet',
      project,
    });
  });
});

// Route POST pour traiter la soumission du formulaire d'édition d'un projet
app.post(
  '/projets/:id/edit',
  isAuthenticated,
  upload.single('image'),
  csrfMiddleware,
  validateProject,
  (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.userId;
    const adminUsername = process.env.ADMIN_USERNAME;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Récupérer le projet pour pré-remplir le formulaire
      const projectQuery = `
        SELECT * FROM projects
        WHERE id = ?
      `;
      db.get(projectQuery, [projectId], (err, project) => {
        if (err) {
          console.error('Erreur lors de la récupération du projet:', err.message);
          return res.status(500).send('Erreur serveur');
        }

        return res.status(400).render('editProject', {
          title: 'Modifier le projet',
          project,
          errors: errors.array(),
        });
      });
      return;
    }

    const { name, description, category } = req.body;
    let image = req.file ? `uploads/${req.file.filename}` : null;

    const projectQuery = `
      SELECT * FROM projects
      WHERE id = ?
    `;

    db.get(projectQuery, [projectId], (err, project) => {
      if (err) {
        console.error('Erreur lors de la récupération du projet:', err.message);
        return res.status(500).send('Erreur serveur');
      }

      if (!project) {
        return res.status(404).send('Projet non trouvé');
      }

      if (userId !== project.userId && req.session.username !== adminUsername) {
        return res.status(403).send("Vous n'êtes pas autorisé à modifier ce projet.");
      }

      if (!image) {
        image = project.image;
      } else {
        // Supprimer l'ancienne image du serveur (optionnel)
        if (project.image && fs.existsSync(`public/${project.image}`)) {
          fs.unlink(`public/${project.image}`, (err) => {
            if (err) {
              console.error("Erreur lors de la suppression de l'ancienne image:", err.message);
            } else {
              console.log('Ancienne image supprimée avec succès.');
            }
          });
        }
      }

      const updateProjectQuery = `
        UPDATE projects
        SET name = ?, description = ?, category = ?, image = ?
        WHERE id = ?
      `;

      db.run(updateProjectQuery, [name, description, category, image, projectId], function (err) {
        if (err) {
          console.error("Erreur lors de la mise à jour du projet:", err.message);
          return res.status(500).send("Erreur lors de la mise à jour du projet.");
        } else {
          res.redirect(`/projets/${projectId}`);
        }
      });
    });
  }
);

// Route pour afficher la page de connexion
app.get('/login', csrfMiddleware, (req, res) => {
  res.render('login', { title: 'Login' });
});

// Route pour gérer la connexion
app.post(
  '/login',
  csrfMiddleware,
  [
    body('username').trim().notEmpty().withMessage("Le nom d'utilisateur est requis."),
    body('password').notEmpty().withMessage('Le mot de passe est requis.'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    const acceptHeader = req.headers.accept || '';
    const isAjaxRequest = req.xhr || acceptHeader.indexOf('json') > -1;

    if (!errors.isEmpty()) {
      if (isAjaxRequest) {
        return res.status(400).json({ success: false, errors: errors.array() });
      } else {
        return res.status(400).render('login', {
          title: 'Login',
          errors: errors.array(),
        });
      }
    }

    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
      if (err) {
        console.error("Erreur lors de la récupération de l'utilisateur:", err.message);
        if (isAjaxRequest) {
          return res.status(500).json({ success: false, message: 'Erreur du serveur' });
        } else {
          return res.status(500).render('login', {
            title: 'Login',
            errors: [{ msg: 'Erreur du serveur' }],
          });
        }
      } else if (row) {
        const hashedPassword = hashPassword(password, row.salt);
        if (hashedPassword === row.password) {
          req.session.username = username;
          req.session.userId = row.id;
          if (isAjaxRequest) {
            return res.json({ success: true });
          } else {
            return res.redirect('/');
          }
        } else {
          if (isAjaxRequest) {
            return res.status(400).json({ success: false, message: 'Mot de passe incorrect' });
          } else {
            return res.status(400).render('login', {
              title: 'Login',
              errors: [{ msg: 'Mot de passe incorrect' }],
            });
          }
        }
      } else {
        if (isAjaxRequest) {
          return res.status(400).json({ success: false, message: 'Utilisateur non trouvé' });
        } else {
          return res.status(400).render('login', {
            title: 'Login',
            errors: [{ msg: 'Utilisateur non trouvé' }],
          });
        }
      }
    });
  }
);

// Route pour afficher le formulaire de création de compte
app.get('/register', csrfMiddleware, (req, res) => {
  res.render('register', { title: 'Créer un compte' });
});

// Route pour la création de compte
app.post(
  '/register',
  csrfMiddleware,
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage("Le nom d'utilisateur est requis.")
      .isLength({ max: 50 })
      .withMessage("Le nom d'utilisateur est trop long."),
    body('email')
      .trim()
      .notEmpty()
      .withMessage("L'email est requis.")
      .isEmail()
      .withMessage('Email invalide.')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Le mot de passe est requis.')
      .isLength({ min: 6 })
      .withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    const isAjaxRequest = req.xhr || req.headers.accept.indexOf('json') > -1;

    if (!errors.isEmpty()) {
      if (isAjaxRequest) {
        return res.status(400).json({ success: false, errors: errors.array() });
      } else {
        return res.status(400).render('register', {
          title: 'Créer un compte',
          errors: errors.array(),
        });
      }
    }

    const { username, email, password } = req.body;

    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    db.run(
      `INSERT INTO users (username, email, password, salt) VALUES (?, ?, ?, ?)`,
      [username, email, hashedPassword, salt],
      function (err) {
        if (err) {
          console.error("Erreur lors de la création de l'utilisateur:", err.message);
          if (err.code === 'SQLITE_CONSTRAINT') {
            if (isAjaxRequest) {
              return res.status(400).json({ success: false, message: "Nom d'utilisateur ou email déjà pris" });
            } else {
              return res.status(400).render('register', {
                title: 'Créer un compte',
                errors: [{ msg: "Nom d'utilisateur ou email déjà pris" }],
              });
            }
          } else {
            if (isAjaxRequest) {
              return res.status(500).json({ success: false, message: 'Erreur du serveur' });
            } else {
              return res.status(500).render('register', {
                title: 'Créer un compte',
                errors: [{ msg: 'Erreur du serveur' }],
              });
            }
          }
        } else {
          if (isAjaxRequest) {
            return res.json({ success: true, message: 'Compte créé avec succès' });
          } else {
            res.redirect('/login');
          }
        }
      }
    );
  }
);

// Route pour la déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err.message);
      return res.status(500).send('Erreur lors de la déconnexion');
    }
    res.redirect('/');
  });
});

// Route pour afficher le profil de l'utilisateur
app.get('/profile', isAuthenticated, csrfMiddleware, (req, res) => {
  db.get(`SELECT * FROM users WHERE id = ?`, [req.session.userId], (err, row) => {
    if (err) {
      console.error("Erreur lors de la récupération de l'utilisateur:", err.message);
      return res.status(500).send('Erreur du serveur');
    }
    if (row) {
      res.render('profile', {
        title: 'Mon Profil',
        username: row.username,
        email: row.email,
      });
    } else {
      return res.status(404).send('Utilisateur non trouvé');
    }
  });
});

// Route pour gérer le changement de mot de passe
app.post(
  '/change-password',
  isAuthenticated,
  csrfMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Le mot de passe actuel est requis.'),
    body('newPassword')
      .notEmpty()
      .withMessage('Le nouveau mot de passe est requis.')
      .isLength({ min: 6 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères.'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    const isAjaxRequest = req.xhr || req.headers.accept.indexOf('json') > -1;

    if (!errors.isEmpty()) {
      if (isAjaxRequest) {
        return res.status(400).json({ success: false, errors: errors.array() });
      } else {
        return res.status(400).send('Données invalides.');
      }
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        console.error("Erreur lors de la récupération de l'utilisateur:", err.message);
        if (isAjaxRequest) {
          return res.status(500).json({ success: false, message: 'Erreur du serveur' });
        } else {
          return res.status(500).send('Erreur du serveur');
        }
      }

      if (!row) {
        if (isAjaxRequest) {
          return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        } else {
          return res.status(404).send('Utilisateur non trouvé');
        }
      }

      const hashedCurrentPassword = hashPassword(currentPassword, row.salt);
      if (hashedCurrentPassword !== row.password) {
        if (isAjaxRequest) {
          return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
        } else {
          return res.status(400).send('Mot de passe actuel incorrect');
        }
      }

      const salt = generateSalt();
      const hashedNewPassword = hashPassword(newPassword, salt);

      db.run(
        `UPDATE users SET password = ?, salt = ? WHERE id = ?`,
        [hashedNewPassword, salt, userId],
        function (err) {
          if (err) {
            console.error("Erreur lors de la mise à jour du mot de passe:", err.message);
            if (isAjaxRequest) {
              return res.status(500).json({ success: false, message: 'Erreur du serveur' });
            } else {
              return res.status(500).send('Erreur du serveur');
            }
          } else {
            req.session.destroy((err) => {
              if (err) {
                console.error(
                  'Erreur lors de la déconnexion après le changement de mot de passe:',
                  err.message
                );
                if (isAjaxRequest) {
                  return res
                    .status(500)
                    .json({
                      success: false,
                      message: 'Erreur lors de la déconnexion après le changement de mot de passe',
                    });
                } else {
                  return res.status(500).send('Erreur lors de la déconnexion');
                }
              }
              if (isAjaxRequest) {
                return res.json({
                  success: true,
                  message: 'Mot de passe mis à jour avec succès. Vous avez été déconnecté.',
                  redirect: '/login',
                });
              } else {
                res.redirect('/login');
              }
            });
          }
        }
      );
    });
  }
);

// Route pour soumettre un commentaire
app.post(
  '/comments',
  isAuthenticated,
  csrfMiddleware,
  [
    body('comment').trim().notEmpty().withMessage('Le commentaire est requis.'),
    body('projectId').isInt().withMessage('ID de projet invalide.'),
  ],
  (req, res) => {
    console.log('Requête reçue pour /comments');
    console.log('En-têtes de la requête:', req.headers);
    console.log('Jeton CSRF reçu:', req.headers['x-csrf-token']);
    console.log('Session utilisateur:', req.session);

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Renvoyer toujours du JSON en cas d'erreur de validation
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { comment, projectId } = req.body;
    const userId = req.session.userId;
    const date = new Date().toISOString();

    // Insertion du commentaire dans la base de données
    db.run(
      `INSERT INTO comments (projectId, userId, comment, date) VALUES (?, ?, ?, ?)`,
      [projectId, userId, comment, date],
      function (err) {
        if (err) {
          console.error("Erreur lors de l'ajout du commentaire:", err.message);
          return res
            .status(500)
            .json({ success: false, message: "Erreur lors de l'ajout du commentaire." });
        } else {
          // Récupérer le commentaire ajouté avec le username
          const commentId = this.lastID;
          const getCommentQuery = `
            SELECT comments.*, users.username
            FROM comments
            JOIN users ON comments.userId = users.id
            WHERE comments.id = ?
          `;
          db.get(getCommentQuery, [commentId], (err, newComment) => {
            if (err) {
              console.error('Erreur lors de la récupération du commentaire:', err.message);
              return res
                .status(500)
                .json({ success: false, message: "Erreur lors de la récupération du commentaire." });
            } else {
              // Ajouter des informations supplémentaires nécessaires pour le front-end
              newComment.canDelete = true; // L'utilisateur peut supprimer son propre commentaire
              newComment.reactions = {}; // Pas de réactions initialement
              return res.json({
                success: true,
                message: 'Commentaire ajouté avec succès.',
                comment: newComment,
              });
            }
          });
        }
      }
    );
  }
);


// Route pour gérer les réactions aux commentaires
app.post('/react/:commentId', isAuthenticated, csrfMiddleware, (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  const userId = parseInt(req.session.userId, 10);
  const emoji = req.body.emoji.trim();
  const date = new Date().toISOString();

  console.log('Tentative de réaction :', { commentId, emoji, userId });

  // Validation des données reçues
  if (isNaN(commentId) || isNaN(userId) || !emoji) {
    return res.status(400).json({ success: false, message: 'Données invalides.' });
  }

  // Vérifier si la réaction existe déjà pour cet utilisateur
  const checkReactionQuery = `
    SELECT id FROM comment_reactions
    WHERE comment_id = ? AND userId = ? AND emoji = ?
  `;

  db.get(checkReactionQuery, [commentId, userId, emoji], (err, row) => {
    if (err) {
      console.error('Erreur lors de la vérification de la réaction:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }

    console.log('Résultat de la vérification de la réaction :', row);

    if (row) {
      // La réaction existe, on la supprime (toggle off)
      const deleteReactionQuery = `
        DELETE FROM comment_reactions WHERE id = ?
      `;
      db.run(deleteReactionQuery, [row.id], function (err) {
        if (err) {
          console.error('Erreur lors de la suppression de la réaction:', err);
          return res
            .status(500)
            .json({ success: false, message: 'Erreur lors de la suppression de la réaction.' });
        }
        // Compter le nombre total de réactions pour cet emoji sur le commentaire
        const countReactionsQuery = `
          SELECT COUNT(*) AS count
          FROM comment_reactions
          WHERE comment_id = ? AND emoji = ?
        `;
        db.get(countReactionsQuery, [commentId, emoji], (err, countRow) => {
          if (err) {
            console.error('Erreur lors du comptage des réactions:', err);
            return res
              .status(500)
              .json({ success: false, message: 'Erreur lors du comptage des réactions.' });
          } else {
            res.json({ success: true, updatedCount: countRow.count, userHasReacted: false });
          }
        });
      });
    } else {
      // La réaction n'existe pas, on l'ajoute (toggle on)
      const insertReactionQuery = `
        INSERT INTO comment_reactions (comment_id, userId, emoji, date)
        VALUES (?, ?, ?, ?)
      `;
      db.run(insertReactionQuery, [commentId, userId, emoji, date], function (err) {
        if (err) {
          console.error('Erreur lors de l\'ajout de la réaction:', err);
          return res
            .status(500)
            .json({ success: false, message: 'Erreur lors de l\'ajout de la réaction.' });
        }
        // Compter le nombre total de réactions pour cet emoji sur le commentaire
        const countReactionsQuery = `
          SELECT COUNT(*) AS count
          FROM comment_reactions
          WHERE comment_id = ? AND emoji = ?
        `;
        db.get(countReactionsQuery, [commentId, emoji], (err, countRow) => {
          if (err) {
            console.error('Erreur lors du comptage des réactions:', err);
            return res
              .status(500)
              .json({ success: false, message: 'Erreur lors du comptage des réactions.' });
          } else {
            res.json({ success: true, updatedCount: countRow.count, userHasReacted: true });
          }
        });
      });
    }
  });
});

// Route pour supprimer un commentaire, avec suppression des réactions associées
app.delete('/comments/:id', isAuthenticated, csrfMiddleware, (req, res) => {
  const commentId = req.params.id;
  const userId = req.session.userId; // ID de l'utilisateur connecté
  const adminUsername = process.env.ADMIN_USERNAME; // Nom d'utilisateur admin défini dans .env

  // Récupération des informations de l'utilisateur connecté
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.error("Erreur lors de la vérification de l'utilisateur:", err.message);
      return res.status(500).send('Erreur serveur.');
    }

    if (!user) {
      return res.status(403).send('Utilisateur non trouvé.');
    }

    const deleteComment = () => {
      // Suppression des réactions associées avant de supprimer le commentaire
      db.run(`DELETE FROM comment_reactions WHERE comment_id = ?`, [commentId], (err) => {
        if (err) {
          console.error('Erreur lors de la suppression des réactions associées:', err.message);
          return res.status(500).send('Erreur lors de la suppression du commentaire.');
        }

        // Suppression du commentaire
        db.run(`DELETE FROM comments WHERE id = ?`, [commentId], function (err) {
          if (err) {
            console.error('Erreur lors de la suppression du commentaire:', err.message);
            return res.status(500).send('Erreur lors de la suppression du commentaire.');
          }
          res.status(200).send('Commentaire supprimé avec succès.');
        });
      });
    };

    // Si l'utilisateur est l'admin défini dans .env, il peut supprimer n'importe quel commentaire
    if (user.username === adminUsername) {
      return deleteComment();
    }

    // Vérifier si l'utilisateur est propriétaire du commentaire
    db.get(`SELECT * FROM comments WHERE id = ? AND userId = ?`, [commentId, userId], (err, comment) => {
      if (err) {
        console.error('Erreur lors de la vérification du commentaire:', err.message);
        return res.status(500).send('Erreur serveur.');
      }

      if (!comment) {
        return res.status(403).send("Vous n'êtes pas autorisé à supprimer ce commentaire.");
      }

      deleteComment();
    });
  });
});

// Route pour supprimer un projet (accessible à l'administrateur et au créateur du projet)
app.delete('/projets/:id', isAuthenticated, csrfMiddleware, (req, res) => {
  const projectId = req.params.id;
  const userId = req.session.userId;
  const adminUsername = process.env.ADMIN_USERNAME;

  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.error("Erreur lors de la vérification de l'utilisateur:", err.message);
      return res.status(500).send('Erreur serveur.');
    }

    if (!user) {
      return res.status(403).send('Utilisateur non trouvé.');
    }

    // Vérifier si l'utilisateur est l'administrateur
    if (user.username === adminUsername) {
      // L'administrateur peut supprimer le projet
      deleteProject();
    } else {
      // Vérifier si l'utilisateur est le créateur du projet
      db.get(`SELECT * FROM projects WHERE id = ? AND userId = ?`, [projectId, userId], (err, project) => {
        if (err) {
          console.error('Erreur lors de la vérification du projet:', err.message);
          return res.status(500).send('Erreur serveur.');
        }

        if (!project) {
          return res.status(403).send("Vous n'êtes pas autorisé à supprimer ce projet.");
        }

        deleteProject();
      });
    }

    function deleteProject() {
      // Supprimer les réactions associées aux commentaires du projet
      db.run(
        `DELETE FROM comment_reactions WHERE comment_id IN (SELECT id FROM comments WHERE projectId = ?)`,
        [projectId],
        function (err) {
          if (err) {
            console.error('Erreur lors de la suppression des réactions associées:', err.message);
            return res.status(500).send('Erreur lors de la suppression des réactions associées.');
          }

          // Supprimer les commentaires associés au projet
          db.run(`DELETE FROM comments WHERE projectId = ?`, [projectId], function (err) {
            if (err) {
              console.error('Erreur lors de la suppression des commentaires associés:', err.message);
              return res.status(500).send('Erreur lors de la suppression des commentaires associés.');
            }

            // Supprimer le projet
            db.run(`DELETE FROM projects WHERE id = ?`, [projectId], function (err) {
              if (err) {
                console.error('Erreur lors de la suppression du projet:', err.message);
                return res.status(500).send('Erreur lors de la suppression du projet.');
              }

              res.status(200).send('Projet supprimé avec succès.');
            });
          });
        }
      );
    }
  });
});

// Démarrage du serveur avec port configurable via variable d'environnement
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
