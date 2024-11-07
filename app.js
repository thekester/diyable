// app.js
require('dotenv').config(); // Charger les variables d'environnement depuis .env
const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Import sqlite3

// Pour servir des fichiers statiques (comme le CSS, le JavaScript)
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'assets', 'images'))); // Serve images


// Middleware pour parser les requêtes POST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion à la base de données SQLite

const dbPath = path.join('./bdd', 'diyable.db');
console.log(`Chemin de la base de données: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
  }
});

// Configuration du moteur de template (si vous utilisez Pug par exemple)
app.set('view engine', 'pug');
app.set('views', './views');

// Route principale
app.get('/', (req, res) => {
  res.render('index', { title: 'Accueil' });
});

// Route principale
app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact' });
  });

// Démarrage du serveur avec port configurable via variable d'environnement
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Serveur en cours d\'exécution sur le port ${PORT}`);
});