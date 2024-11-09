require('dotenv').config(); // Charger les variables d'environnement depuis .env

const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de la session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'votre_secret_par_défaut', // Assurez-vous de définir SESSION_SECRET dans .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Mettez à true si vous utilisez HTTPS
  })
);

app.use((req, res, next) => {
  res.locals.username = req.session.username; // Ajoute `username` à `res.locals`
  next();
});

// Pour servir des fichiers statiques (comme le CSS, le JavaScript)
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'assets', 'images'))); // Servir les images

// Configuration du moteur de template (Pug)
app.set('view engine', 'pug');
app.set('views', './views');

// Connexion à la base de données SQLite
const dbPath = path.join(__dirname, 'bdd', 'diyable.db');
console.log(`Chemin de la base de données: ${dbPath}`);

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

// Création des requêtes de création de tables avec la contrainte UNIQUE
const createTableProjectsQuery = `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image TEXT,
    UNIQUE(name, date, image)
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
const createTableCommentsQuery = `
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    username TEXT NOT NULL,
    comment TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id)
  )
`;
const createTableCommentReactionsQuery = `
  CREATE TABLE IF NOT EXISTS comment_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    emoji TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id),
    UNIQUE (comment_id, username, emoji)
  )
`;

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
    process.exit(1); // Arrêter le serveur si la connexion échoue
  } else {
    console.log('Connecté à la base de données SQLite.');

    // Création ou modification des tables
    db.serialize(() => {
      db.run(createTableProjectsQuery, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table projects:', err.message);
        } else {
          console.log('Table "projects" créée ou déjà existante.');
          // Vérifier et insérer des données initiales
          checkAndInsertInitialData();
        }
      });

      db.run(createTableUsersQuery, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table users:', err.message);
        } else {
          console.log('Table "users" créée ou déjà existante.');
        }
      });

      db.run(createTableCommentsQuery, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table comments:', err.message);
        } else {
          console.log('Table "comments" créée ou déjà existante.');
          // Après avoir créé la table comments, migrer les données si nécessaire
          migrateCommentsTable();
        }
      });

      db.run(createTableCommentReactionsQuery, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table comment_reactions:', err.message);
        } else {
          console.log('Table "comment_reactions" créée ou déjà existante.');
          // Migrer les réactions existantes
          migrateReactions();
        }
      });
    });
  }
});

// Fonction pour vérifier, recréer la table si nécessaire et insérer des données initiales
const checkAndInsertInitialData = () => {
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
      recreateProjectsTable();
    } else {
      // Procéder à l'insertion des données initiales
      insertInitialProjectsData();
    }
  });
};

const recreateProjectsTable = () => {
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
          INSERT INTO projects (id, date, name, description, category, image)
          SELECT id, date, name, description, category, image
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
              insertInitialProjectsData();
            });
          }
        );
      });
    });
  });
};

const insertInitialProjectsData = () => {
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

    // Insertion ou mise à jour des données initiales
    const insertQuery = `
      INSERT INTO projects (date, name, description, category, image)
      VALUES
        ('2024-11-07', 'Projet IoT Innovant', 'Découvrez comment ce projet IoT peut transformer votre quotidien.', 'tech', 'projet-iot-exemple.jpg'),
        ('2024-11-06', 'Atelier de Bricolage', 'Un projet de bricolage pour embellir votre espace de vie.', 'craft', 'atelier-bricolage.jpg'),
        ('2024-11-03', 'Création d''un Jardin Vertical', 'Fabriquez un jardin vertical pour votre balcon ou intérieur.', 'garden', 'jardin-vertical.jpg'),
        ('2024-11-01', 'Fabriquer sa Propre Table en Bois', 'Construisez une table en bois personnalisée pour votre maison.', 'woodwork', 'table-bois.jpg'),
        ('2024-10-29', 'Réaliser des Bougies Maison', 'Apprenez à créer des bougies naturelles avec vos propres parfums.', 'craft', 'bougies-maison.jpg'),
        ('2024-10-26', 'Robot Suiveur de Ligne', 'Assemblez un petit robot qui suit une ligne tracée au sol.', 'tech', 'robot-ligne.jpg'),
        ('2024-10-23', 'Peinture sur Tissu', 'Personnalisez vos vêtements avec des motifs peints à la main.', 'art', 'peinture-tissu.jpg'),
        ('2024-10-15', 'Lampe en Bouteille Recyclée', 'Transformez une bouteille en une lampe élégante.', 'recycle', 'lampe-bouteille.jpg'),
        ('2024-10-11', 'Étagère Murale DIY', 'Créez une étagère murale design avec des matériaux simples.', 'woodwork', 'etagere-murale.jpg'),
        ('2024-10-08', 'Fabriquer un Cerf-Volant', 'Construisez un cerf-volant pour profiter des journées venteuses.', 'craft', 'cerf-volant.jpg'),
        ('2024-10-04', 'Enceinte Bluetooth Maison', 'Assemblez votre propre enceinte Bluetooth portable.', 'tech', 'enceinte-bluetooth.jpg'),
        ('2024-10-01', 'Pots de Fleurs Peints', 'Donnez de la couleur à vos plantes avec des pots personnalisés.', 'art', 'pots-fleurs-peints.jpg'),
        ('2024-09-28', 'Horloge Murale en Vinyle', 'Recyclez de vieux disques vinyles en horloges murales.', 'recycle', 'horloge-vinyle.jpg'),
        ('2024-09-25', 'Fabriquer du Savon Naturel', 'Créez vos propres savons avec des ingrédients naturels.', 'craft', 'savon-naturel.jpg'),
        ('2024-09-21', 'Station Météo Connectée', 'Construisez une station météo avec un microcontrôleur.', 'tech', 'station-meteo.jpg'),
        ('2024-09-17', 'Décoration en Macramé', 'Apprenez l''art du macramé pour décorer votre intérieur.', 'craft', 'macrame.jpg'),
        ('2024-09-14', 'Composteur de Jardin', 'Fabriquez un composteur pour recycler vos déchets organiques.', 'garden', 'composteur.jpg'),
        ('2024-09-11', 'Cadre Photo en Bois Recyclé', 'Créez des cadres photo uniques avec du bois récupéré.', 'recycle', 'cadre-photo.jpg'),
        ('2024-09-08', 'Coussins Personnalisés', 'Cousez des coussins avec des motifs et tissus de votre choix.', 'craft', 'coussins.jpg'),
        ('2024-09-03', 'Système d''Arrosage Automatique', 'Installez un système pour arroser vos plantes automatiquement.', 'tech', 'arrosage-automatique.jpg')
      ON CONFLICT(name, date, image) DO UPDATE SET
        description=excluded.description,
        category=excluded.category
    `;

    db.run(insertQuery, function (err) {
      if (err) {
        console.error("Erreur lors de l'insertion ou la mise à jour des projets initiaux:", err.message);
      } else {
        console.log(`Insertion ou mise à jour des projets terminée. ${this.changes} lignes affectées.`);
      }
    });
  });
};

// Fonction pour migrer la table comments si le champ reactions existe
const migrateCommentsTable = () => {
  // Vérifier si le champ reactions existe dans la table comments
  db.get(`PRAGMA table_info(comments)`, (err, columns) => {
    if (err) {
      console.error('Erreur lors de la vérification des colonnes de la table comments:', err.message);
      return;
    }

    db.all(`PRAGMA table_info(comments)`, (err, columns) => {
      if (err) {
        console.error('Erreur lors de la vérification des colonnes de la table comments:', err.message);
        return;
      }

      const hasReactionsColumn = columns.some(column => column.name === 'reactions');

      if (hasReactionsColumn) {
        console.log('Le champ reactions existe dans la table comments. Début de la migration.');
        // Renommer la table comments
        db.run(`ALTER TABLE comments RENAME TO comments_old`, (err) => {
          if (err) {
            console.error('Erreur lors du renommage de la table comments:', err.message);
            return;
          }
          console.log('Table comments renommée en comments_old.');

          // Créer la nouvelle table sans le champ reactions
          db.run(createTableCommentsQuery, (err) => {
            if (err) {
              console.error('Erreur lors de la création de la nouvelle table comments:', err.message);
              return;
            }
            console.log('Nouvelle table comments créée.');

            // Copier les données de l'ancienne table vers la nouvelle
            const copyCommentsDataQuery = `
              INSERT INTO comments (id, projectId, username, comment, date)
              SELECT id, projectId, username, comment, date FROM comments_old
            `;
            db.run(copyCommentsDataQuery, (err) => {
              if (err) {
                console.error('Erreur lors de la copie des données des commentaires:', err.message);
                return;
              }
              console.log('Données des commentaires copiées vers la nouvelle table.');

              // Supprimer l'ancienne table comments_old
              db.run(`DROP TABLE comments_old`, (err) => {
                if (err) {
                  console.error('Erreur lors de la suppression de la table comments_old:', err.message);
                  return;
                }
                console.log('Table comments_old supprimée.');
              });
            });
          });
        });
      } else {
        console.log('Le champ reactions n\'existe pas dans la table comments. Aucune migration nécessaire.');
      }
    });
  });
};

// Fonction pour migrer les réactions existantes vers la nouvelle table
const migrateReactions = () => {
  // Vérifier si des réactions existent dans les commentaires
  db.all(`SELECT id, reactions FROM comments WHERE reactions IS NOT NULL AND reactions != '{}'`, (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des réactions à migrer:', err.message);
      return;
    }

    if (rows.length === 0) {
      console.log('Aucune réaction à migrer.');
      return;
    }

    console.log(`Migration de ${rows.length} commentaires avec des réactions.`);

    const insertReactionStmt = db.prepare(`
      INSERT OR IGNORE INTO comment_reactions (comment_id, username, emoji, date)
      VALUES (?, 'anonymous', ?, ?)
    `);

    rows.forEach(row => {
      let reactions = {};
      try {
        reactions = JSON.parse(row.reactions);
      } catch (e) {
        console.error(`Erreur lors de l'analyse des réactions JSON pour le commentaire ID ${row.id}:`, e);
        return;
      }

      const date = new Date().toISOString();

      for (const [emoji, count] of Object.entries(reactions)) {
        for (let i = 0; i < count; i++) {
          insertReactionStmt.run(row.id, emoji, date, (err) => {
            if (err) {
              console.error('Erreur lors de l\'insertion de la réaction migrée:', err.message);
            }
          });
        }
      }
    });

    insertReactionStmt.finalize((err) => {
      if (err) {
        console.error('Erreur lors de la finalisation de l\'insertion des réactions migrées:', err.message);
      } else {
        console.log('Migration des réactions terminée.');
      }
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

// Routes

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

// Route À Propos
app.get('/about', (req, res) => {
  res.render('about', { title: 'À Propos' });
});

// Route pour les projets
app.get('/projets', (req, res) => {
  const query = `SELECT * FROM projects ORDER BY date DESC`;
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
            username: req.session.username,
          });
        }
      });
    });
  });
});

app.get('/projets/:id', (req, res) => {
  const projectId = req.params.id;

  // Requête pour récupérer les détails du projet
  const projectQuery = `SELECT * FROM projects WHERE id = ?`;
  const commentsQuery = `SELECT * FROM comments WHERE projectId = ? ORDER BY date DESC`;

  db.get(projectQuery, [projectId], (err, project) => {
    if (err) {
      console.error('Erreur lors de la récupération du projet:', err.message);
      return res.status(500).send('Erreur serveur');
    }

    if (!project) {
      return res.status(404).send('Projet non trouvé');
    }

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
          username: req.session.username,
        });
      }
    }

      const commentIds = comments.map(comment => comment.id);

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
        reactions.forEach(reaction => {
          if (!reactionsMap[reaction.comment_id]) {
            reactionsMap[reaction.comment_id] = {};
          }
          reactionsMap[reaction.comment_id][reaction.emoji] = reaction.count;
        });

        comments.forEach(comment => {
          comment.reactions = reactionsMap[comment.id] || {};
        });

        // Rendu de la vue avec les données du projet et les commentaires
        res.render('projectDetail', {
          title: project.name,
          project,
          comments,
          projectId,
          username: req.session.username,
        });
      });
    });
  });
});


// Route pour afficher la page de connexion
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Route pour gérer la connexion
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
  db.run(
    `INSERT INTO users (username, email, password, salt) VALUES (?, ?, ?, ?)`,
    [username, email, hashedPassword, salt],
    function (err) {
      if (err) {
        console.error("Erreur lors de l'insertion :", err);
        if (err.code === 'SQLITE_CONSTRAINT') {
          res.status(409).send("Nom d'utilisateur ou email déjà pris");
        } else {
          res.status(500).send('Erreur du serveur');
        }
      } else {
        res.send('Compte créé avec succès');
      }
    }
  );
});

// Route pour la déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Erreur lors de la déconnexion');
    }
    res.redirect('/'); // Rediriger vers la page d'accueil après déconnexion
  });
});

// Route pour soumettre un commentaire
app.post('/comments', (req, res) => {
  if (!req.session.username) {
    return res.status(403).send('Vous devez être connecté pour commenter.');
  }

  const { comment, projectId } = req.body;
  const username = req.session.username;
  const date = new Date().toISOString();

  // Vérification que les données nécessaires sont présentes
  if (!comment || !projectId) {
    return res.status(400).send('Le commentaire et le projectId sont requis.');
  }

  // Insertion du commentaire dans la base de données
  db.run(
    `INSERT INTO comments (projectId, username, comment, date) VALUES (?, ?, ?, ?)`,
    [projectId, username, comment, date],
    function (err) {
      if (err) {
        console.error("Erreur lors de l'ajout du commentaire:", err.message);
        return res.status(500).send("Erreur lors de l'ajout du commentaire.");
      } else {
        // Redirection vers la page du projet après l'ajout du commentaire
        res.redirect(`/projets/${projectId}`);
      }
    }
  );
});

// Route pour gérer les réactions aux commentaires
// Route pour gérer les réactions aux commentaires
app.post('/react/:commentId', (req, res) => {
  if (!req.session.username) {
    return res.status(403).json({ success: false, message: 'Vous devez être connecté pour réagir.' });
  }

  const { commentId } = req.params;
  const { emoji } = req.body;
  const username = req.session.username;
  const date = new Date().toISOString();

  // Validation des données reçues
  if (!commentId || !emoji) {
    return res.status(400).json({ success: false, message: 'Données invalides.' });
  }

  // Vérifier si la réaction existe déjà pour cet utilisateur
  const checkReactionQuery = `
    SELECT id FROM comment_reactions
    WHERE comment_id = ? AND username = ? AND emoji = ?
  `;

  db.get(checkReactionQuery, [commentId, username, emoji], (err, row) => {
    if (err) {
      console.error('Erreur lors de la vérification de la réaction:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }

    if (row) {
      // La réaction existe, on la supprime (toggle off)
      const deleteReactionQuery = `
        DELETE FROM comment_reactions WHERE id = ?
      `;
      db.run(deleteReactionQuery, [row.id], function (err) {
        if (err) {
          console.error('Erreur lors de la suppression de la réaction:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la réaction.' });
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
            return res.status(500).json({ success: false, message: 'Erreur lors du comptage des réactions.' });
          } else {
            res.json({ success: true, updatedCount: countRow.count, userHasReacted: false });
          }
        });
      });
    } else {
      // La réaction n'existe pas, on l'ajoute (toggle on)
      const insertReactionQuery = `
        INSERT INTO comment_reactions (comment_id, username, emoji, date)
        VALUES (?, ?, ?, ?)
      `;
      db.run(insertReactionQuery, [commentId, username, emoji, date], function (err) {
        if (err) {
          console.error('Erreur lors de l\'ajout de la réaction:', err);
          return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout de la réaction.' });
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
            return res.status(500).json({ success: false, message: 'Erreur lors du comptage des réactions.' });
          } else {
            res.json({ success: true, updatedCount: countRow.count, userHasReacted: true });
          }
        });
      });
    }
  });
});

// Route pour récupérer les commentaires d'un projet (pour mise à jour asynchrone)
app.get('/comments/:projectId', (req, res) => {
  const projectId = req.params.projectId;

  // Requête pour récupérer les commentaires liés à ce projet
  const commentsQuery = `SELECT * FROM comments WHERE projectId = ? ORDER BY date DESC`;

  db.all(commentsQuery, [projectId], (err, comments) => {
    if (err) {
      console.error('Erreur lors de la récupération des commentaires:', err.message);
      return res.status(500).send('Erreur serveur');
    }

    if (comments.length === 0) {
      return res.json([]);
    }

    const commentIds = comments.map(comment => comment.id);

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
      reactions.forEach(reaction => {
        if (!reactionsMap[reaction.comment_id]) {
          reactionsMap[reaction.comment_id] = {};
        }
        reactionsMap[reaction.comment_id][reaction.emoji] = reaction.count;
      });

      comments.forEach(comment => {
        comment.reactions = reactionsMap[comment.id] || {};
      });

      res.json(comments);
    });
  });
});

// Démarrage du serveur avec port configurable via variable d'environnement
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
