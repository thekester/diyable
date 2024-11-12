// old_to_new_migration.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const async = require('async');

function migrateCommentsTable(db, callback) {
  db.all(`PRAGMA table_info(comments)`, (err, columns) => {
    if (err) {
      console.error('Erreur lors de la vérification des colonnes de la table comments:', err.message);
      return callback(err);
    }

    const hasUserIdColumn = columns.some((column) => column.name === 'userId');

    if (!hasUserIdColumn) {
      console.log("La colonne userId n'existe pas dans la table comments. Début de la migration.");

      // Désactiver temporairement les contraintes de clés étrangères
      db.run('PRAGMA foreign_keys = OFF', (err) => {
        if (err) {
          console.error('Erreur lors de la désactivation des clés étrangères:', err.message);
          return callback(err);
        }

        // Renommer la table comments
        db.run(`ALTER TABLE comments RENAME TO comments_old`, (err) => {
          if (err) {
            console.error('Erreur lors du renommage de la table comments:', err.message);
            return callback(err);
          }
          console.log('Table comments renommée en comments_old.');

          // Créer la nouvelle table avec la colonne userId
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
          db.run(createTableCommentsQuery, (err) => {
            if (err) {
              console.error('Erreur lors de la création de la nouvelle table comments:', err.message);
              return callback(err);
            }
            console.log('Nouvelle table comments créée avec la colonne userId.');

            // Préparer l'insertion avec correspondance de username à userId
            const insertCommentStmt = db.prepare(`
              INSERT INTO comments (id, projectId, userId, comment, date)
              VALUES (?, ?, ?, ?, ?)
            `);

            // Récupérer les données de l'ancienne table
            db.all(`SELECT * FROM comments_old`, [], (err, rows) => {
              if (err) {
                console.error('Erreur lors de la récupération des données de comments_old:', err.message);
                return callback(err);
              }

              async.eachSeries(
                rows,
                (row, callbackEach) => {
                  db.get(`SELECT id FROM users WHERE username = ?`, [row.username], (err, user) => {
                    if (err) {
                      console.error("Erreur lors de la récupération de l'userId:", err.message);
                      return callbackEach(err);
                    }

                    if (user) {
                      // Insérer le commentaire avec le userId trouvé
                      insertCommentStmt.run(row.id, row.projectId, user.id, row.comment, row.date, (err) => {
                        if (err) {
                          console.error("Erreur lors de l'insertion du commentaire migré:", err.message);
                        }
                        callbackEach();
                      });
                    } else {
                      console.warn(
                        `Utilisateur ${row.username} non trouvé. Le commentaire ID ${row.id} ne sera pas migré.`
                      );
                      callbackEach();
                    }
                  });
                },
                (err) => {
                  insertCommentStmt.finalize();
                  if (err) {
                    console.error('Erreur lors de la migration des commentaires:', err.message);
                    return callback(err);
                  } else {
                    console.log('Migration des commentaires terminée.');

                    // Supprimer l'ancienne table comments_old
                    db.run(`DROP TABLE comments_old`, (err) => {
                      if (err) {
                        console.error('Erreur lors de la suppression de la table comments_old:', err.message);
                        return callback(err);
                      }
                      console.log('Table comments_old supprimée.');

                      // Réactiver les clés étrangères
                      db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) {
                          console.error('Erreur lors de la réactivation des clés étrangères:', err.message);
                          return callback(err);
                        }
                        callback(); // Migration terminée
                      });
                    });
                  }
                }
              );
            });
          });
        });
      });
    } else {
      console.log('La colonne userId existe déjà dans la table comments. Aucune migration nécessaire.');
      callback();
    }
  });
}

function migrateCommentReactionsTable(db, callback) {
  db.all(`PRAGMA table_info(comment_reactions)`, (err, columns) => {
    if (err) {
      console.error('Erreur lors de la vérification des colonnes de la table comment_reactions:', err.message);
      return callback(err);
    }

    const hasUserIdColumn = columns.some((column) => column.name === 'userId');

    if (!hasUserIdColumn) {
      console.log("La colonne userId n'existe pas dans la table comment_reactions. Début de la migration.");

      // Désactiver temporairement les contraintes de clés étrangères
      db.run('PRAGMA foreign_keys = OFF', (err) => {
        if (err) {
          console.error('Erreur lors de la désactivation des clés étrangères:', err.message);
          return callback(err);
        }

        // Renommer la table comment_reactions
        db.run(`ALTER TABLE comment_reactions RENAME TO comment_reactions_old`, (err) => {
          if (err) {
            console.error('Erreur lors du renommage de la table comment_reactions:', err.message);
            return callback(err);
          }
          console.log('Table comment_reactions renommée en comment_reactions_old.');

          // Créer la nouvelle table avec la colonne userId
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
          db.run(createTableCommentReactionsQuery, (err) => {
            if (err) {
              console.error('Erreur lors de la création de la nouvelle table comment_reactions:', err.message);
              return callback(err);
            }
            console.log('Nouvelle table comment_reactions créée avec la colonne userId.');

            // Préparer l'insertion avec correspondance de username à userId
            const insertReactionStmt = db.prepare(`
              INSERT INTO comment_reactions (id, comment_id, userId, emoji, date)
              VALUES (?, ?, ?, ?, ?)
            `);

            // Récupérer les données de l'ancienne table
            db.all(`SELECT * FROM comment_reactions_old`, [], (err, rows) => {
              if (err) {
                console.error('Erreur lors de la récupération des données de comment_reactions_old:', err.message);
                return callback(err);
              }

              async.eachSeries(
                rows,
                (row, callbackEach) => {
                  db.get(`SELECT id FROM users WHERE username = ?`, [row.username], (err, user) => {
                    if (err) {
                      console.error("Erreur lors de la récupération de l'userId:", err.message);
                      return callbackEach(err);
                    }

                    if (user) {
                      // Insérer la réaction avec le userId trouvé
                      insertReactionStmt.run(row.id, row.comment_id, user.id, row.emoji, row.date, (err) => {
                        if (err) {
                          console.error("Erreur lors de l'insertion de la réaction migrée:", err.message);
                        }
                        callbackEach();
                      });
                    } else {
                      console.warn(
                        `Utilisateur ${row.username} non trouvé. La réaction ID ${row.id} ne sera pas migrée.`
                      );
                      callbackEach();
                    }
                  });
                },
                (err) => {
                  insertReactionStmt.finalize();
                  if (err) {
                    console.error('Erreur lors de la migration des réactions:', err.message);
                    return callback(err);
                  } else {
                    console.log('Migration des réactions terminée.');

                    // Supprimer l'ancienne table comment_reactions_old
                    db.run(`DROP TABLE comment_reactions_old`, (err) => {
                      if (err) {
                        console.error('Erreur lors de la suppression de la table comment_reactions_old:', err.message);
                        return callback(err);
                      }
                      console.log('Table comment_reactions_old supprimée.');

                      // Réactiver les clés étrangères
                      db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) {
                          console.error('Erreur lors de la réactivation des clés étrangères:', err.message);
                          return callback(err);
                        }
                        callback(); // Migration terminée
                      });
                    });
                  }
                }
              );
            });
          });
        });
      });
    } else {
      console.log('La colonne userId existe déjà dans la table comment_reactions. Aucune migration nécessaire.');
      callback();
    }
  });
}

// Connexion à la base de données
const dbPath = path.join(__dirname, 'bdd', 'diyable.db');
console.log(`Chemin de la base de données: ${dbPath}`);

// Assurez-vous que le dossier 'bdd' existe
const bddDir = path.join(__dirname, 'bdd');
if (!fs.existsSync(bddDir)) {
  fs.mkdirSync(bddDir, { recursive: true });
}

// Vérifier les permissions avant d'ouvrir la base de données
try {
  fs.accessSync(dbPath, fs.constants.W_OK);
  console.log('Le fichier de base de données est accessible en écriture.');
} catch (err) {
  console.error("Le fichier de base de données n'est pas accessible en écriture:", err.message);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
    process.exit(1);
  } else {
    console.log('Connecté à la base de données SQLite.');

    async.series(
      [
        (cb) => {
          migrateCommentsTable(db, cb);
        },
        (cb) => {
          migrateCommentReactionsTable(db, cb);
        },
      ],
      (err) => {
        if (err) {
          console.error('Erreur lors des migrations:', err.message);
        } else {
          console.log('Toutes les migrations ont été effectuées avec succès.');
        }
        db.close((err) => {
          if (err) {
            console.error('Erreur lors de la fermeture de la base de données:', err.message);
          } else {
            console.log('Connexion à la base de données fermée.');
          }
        });
      }
    );
  }
});
