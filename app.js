const express = require('express');
const app = express();
const path = require('path');

// Pour servir des fichiers statiques (comme le CSS, le JavaScript)
app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'assets', 'images'))); // Serve images

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

// Démarrer le serveur
app.listen(5010, () => {
  console.log('Serveur en cours d\'exécution sur le port 5010...');
});
