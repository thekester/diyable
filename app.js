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

// Vérifier les permissions avant d'ouvrir la base de données
try {
  fs.accessSync(dbPath, fs.constants.W_OK);
  console.log('Le fichier de base de données est accessible en écriture.');
} catch (err) {
  console.error('Le fichier de base de données n\'est pas accessible en écriture:', err.message);
  process.exit(1);
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

// Fonction pour vérifier, supprimer les doublons et insérer des données initiales
const checkAndInsertInitialData = () => {
  console.log('Vérification et insertion des données initiales.');

  // Démarrer une séquence d'opérations
  db.serialize(() => {
    // 1. Création de la table avec contrainte UNIQUE sur 'name'
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT,
        image TEXT
      )
    `;

    db.run(createTableQuery, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table:', err.message);
        return;
      }
      console.log('Table "projects" vérifiée ou créée avec succès.');
    });

    // 2. Suppression des doublons existants
    const deleteDuplicatesQuery = `
      DELETE FROM projects
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM projects
        GROUP BY name
      )
    `;

    db.run(deleteDuplicatesQuery, function(err) {
      if (err) {
        console.error('Erreur lors de la suppression des doublons:', err.message);
        return;
      }
      console.log(`Doublons supprimés. ${this.changes} enregistrements affectés.`);
    });

    // 3. Insertion des données initiales
    const insertQuery = `
      INSERT OR IGNORE INTO projects (date, name, description, category, image)
      VALUES
        ('2024-11-07', 'Projet IoT Innovant', 'Découvrez comment ce projet IoT peut transformer votre quotidien.', 'tech', 'projet-iot-innovant.jpg'),
        ('2024-11-06', 'Atelier de Bricolage', 'Un projet de bricolage pour embellir votre espace de vie.', 'craft', 'atelier-bricolage.jpg'),
        ('2024-11-05', 'Création d\'un Jardin Vertical', 'Fabriquez un jardin vertical pour votre balcon ou intérieur.', 'garden', 'jardin-vertical.jpg'),
        ('2024-11-04', 'Fabriquer sa Propre Table en Bois', 'Construisez une table en bois personnalisée pour votre maison.', 'woodwork', 'table-bois.jpg'),
        ('2024-11-03', 'Réaliser des Bougies Maison', 'Apprenez à créer des bougies naturelles avec vos propres parfums.', 'craft', 'bougies-maison.jpg'),
        ('2024-11-02', 'Robot Suiveur de Ligne', 'Assemblez un petit robot qui suit une ligne tracée au sol.', 'tech', 'robot-ligne.jpg'),
        ('2024-11-01', 'Peinture sur Tissu', 'Personnalisez vos vêtements avec des motifs peints à la main.', 'art', 'peinture-tissu.jpg'),
        ('2024-10-31', 'Lampe en Bouteille Recyclée', 'Transformez une bouteille en une lampe élégante.', 'recycle', 'lampe-bouteille.jpg'),
        ('2024-10-30', 'Étagère Murale DIY', 'Créez une étagère murale design avec des matériaux simples.', 'woodwork', 'etagere-murale.jpg'),
        ('2024-10-29', 'Fabriquer un Cerf-Volant', 'Construisez un cerf-volant pour profiter des journées venteuses.', 'craft', 'cerf-volant.jpg'),
        ('2024-10-28', 'Enceinte Bluetooth Maison', 'Assemblez votre propre enceinte Bluetooth portable.', 'tech', 'enceinte-bluetooth.jpg'),
        ('2024-10-27', 'Pots de Fleurs Peints', 'Donnez de la couleur à vos plantes avec des pots personnalisés.', 'art', 'pots-fleurs-peints.jpg'),
        ('2024-10-26', 'Horloge Murale en Vinyle', 'Recyclez de vieux disques vinyles en horloges murales.', 'recycle', 'horloge-vinyle.jpg'),
        ('2024-10-25', 'Fabriquer du Savon Naturel', 'Créez vos propres savons avec des ingrédients naturels.', 'craft', 'savon-naturel.jpg'),
        ('2024-10-24', 'Station Météo Connectée', 'Construisez une station météo avec un microcontrôleur.', 'tech', 'station-meteo.jpg'),
        ('2024-10-23', 'Décoration en Macramé', 'Apprenez l\'art du macramé pour décorer votre intérieur.', 'craft', 'macrame.jpg'),
        ('2024-10-22', 'Composteur de Jardin', 'Fabriquez un composteur pour recycler vos déchets organiques.', 'garden', 'composteur.jpg'),
        ('2024-10-21', 'Cadre Photo en Bois Recyclé', 'Créez des cadres photo uniques avec du bois récupéré.', 'recycle', 'cadre-photo.jpg'),
        ('2024-10-20', 'Coussins Personnalisés', 'Cousez des coussins avec des motifs et tissus de votre choix.', 'craft', 'coussins.jpg'),
        ('2024-10-19', 'Système d\'Arrosage Automatique', 'Installez un système pour arroser vos plantes automatiquement.', 'tech', 'arrosage-automatique.jpg')
    `;

    db.run(insertQuery, function(err) {
      if (err) {
        console.error('Erreur lors de l\'insertion des projets initiaux:', err.message);
      } else {
        console.log(`Tentative d'insertion des projets initiaux terminée. ${this.changes} lignes insérées.`);
      }
    });
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
        .map(row => row.category)
        .filter(cat => cat && !['autre', 'other'].includes(cat.toLowerCase()));

      db.all(query, [], (err, projectRows) => {
        if (err) {
          console.error('Erreur lors de la récupération des projets:', err.message);
          res.status(500).send('Erreur serveur');
        } else {
          res.render('projets', { 
            title: 'Projets', 
            projects: projectRows,
            categories 
          });
        }
      });
    });
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
