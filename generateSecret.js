const fs = require('fs');
const crypto = require('crypto');

// Fonction pour générer une clé secrète aléatoire
function generateSecret() {
  const secret = crypto.randomBytes(64).toString('hex');
  return secret;
}

// Vérifier si le fichier .env existe
if (fs.existsSync('.env')) {
  // Si le fichier .env existe déjà, ne pas écraser la clé
  console.log('.env file already exists. Skipping key generation.');
} else {
  // Générer la clé et l'ajouter au fichier .env
  const secret = generateSecret();
  fs.writeFileSync('.env', `SESSION_SECRET=${secret}\n`, { flag: 'a' });
  console.log('SESSION_SECRET generated and saved to .env');
}
