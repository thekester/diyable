document.addEventListener('DOMContentLoaded', function () {
  // Récupérer le jeton CSRF depuis la balise meta
  const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : '';

  // **Implémentation du Mode Sombre**

  // Sélectionner la case à cocher du mode sombre
  const darkModeToggle = document.getElementById('dark-mode-toggle');

  function applyDarkMode(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
      if (darkModeToggle) darkModeToggle.checked = true;
    } else {
      document.documentElement.classList.remove('dark-mode');
      if (darkModeToggle) darkModeToggle.checked = false;
    }
  }

  // Vérifier si l'utilisateur a une préférence enregistrée
  const userPrefersDark = localStorage.getItem('dark-mode');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Définir le mode initial basé sur la préférence de l'utilisateur ou du système
  if (userPrefersDark !== null) {
    applyDarkMode(userPrefersDark === 'true');
  } else {
    applyDarkMode(systemPrefersDark);
  }

  // Ajouter un écouteur d'événement à la case à cocher
  window.toggleDarkMode = function () {
    const isDarkMode = darkModeToggle.checked;
    localStorage.setItem('dark-mode', isDarkMode);
    applyDarkMode(isDarkMode);
  };

  // Optionnel : Écouter les changements du mode sombre du système
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', (e) => {
    if (localStorage.getItem('dark-mode') === null) {
      applyDarkMode(e.matches);
    }
  });

  // **Activation des transitions après le chargement**
  document.body.classList.add('transition-enabled');

  // **Code existant**

  // Sélection des boutons de filtre
  const filterButtons = document.querySelectorAll('.filter-button');
  const projectCards = document.querySelectorAll('.project-card');
  const noProjectsMessage = document.getElementById('no-projects-message');

  // Vérifiez que les boutons existent avant de tenter d'accéder à leurs propriétés
  if (filterButtons && filterButtons.length > 0) {
    filterButtons.forEach((button) => {
      button.addEventListener('click', function () {
        const category = this.dataset.category;

        // Gestion de la classe active
        filterButtons.forEach((btn) => btn.classList.remove('active'));
        this.classList.add('active');

        // Compteur pour les projets visibles
        let projectsVisible = 0;

        // Vérifiez que les cartes existent également
        if (projectCards && projectCards.length > 0) {
          projectCards.forEach((card) => {
            const cardCategory = card.dataset.category ? card.dataset.category.toLowerCase() : '';

            if (category === 'all') {
              card.style.display = 'block';
              projectsVisible++;
            } else if (category === 'autre') {
              if (!cardCategory || ['autre', 'other'].includes(cardCategory)) {
                card.style.display = 'block';
                projectsVisible++;
              } else {
                card.style.display = 'none';
              }
            } else {
              if (cardCategory === category.toLowerCase()) {
                card.style.display = 'block';
                projectsVisible++;
              } else {
                card.style.display = 'none';
              }
            }
          });
        }

        // Afficher ou cacher le message 'Aucun projet disponible pour cette catégorie.'
        if (projectsVisible === 0) {
          if (noProjectsMessage) {
            noProjectsMessage.style.display = 'block';
          }
        } else {
          if (noProjectsMessage) {
            noProjectsMessage.style.display = 'none';
          }
        }
      });
    });
  } else {
    console.warn('Aucun bouton de filtre trouvé sur la page.');
  }

  // Exemple d'effet de clic sur le bouton héro
  const heroButton = document.querySelector('.hero button');
  if (heroButton) {
    heroButton.addEventListener('click', function () {
      // Défilement vers la section des projets
      const projectSection = document.querySelector('#projets');
      if (projectSection) {
        projectSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  } else {
    console.warn('Aucun bouton héro trouvé sur la page.');
  }

  // Gestion de l'affichage des commentaires des projets
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    if (!commentForm.classList.contains('listener-attached')) {
      commentForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Empêche le rechargement de la page
        console.log('Formulaire soumis');

        // Désactiver le bouton de soumission pour éviter les doubles clics
        const submitButton = commentForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
        }

        const formData = new FormData(commentForm);
        const data = {
          comment: formData.get('comment'),
          projectId: formData.get('projectId'),
        };
        const csrfToken = formData.get('_csrf'); // Récupérer le jeton CSRF à partir du formulaire

        fetch('/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify(data),
          credentials: 'include',
        })
          .then((response) => {
            return response.text().then((text) => {
              // Tenter de parser le texte en JSON
              let data;
              try {
                data = JSON.parse(text);
              } catch (error) {
                console.error('Erreur lors du parsing du JSON:', error);
                console.error('Réponse non JSON:', text);
                throw new Error('Réponse du serveur invalide.');
              }

              if (!response.ok) {
                console.error('Erreur du serveur:', data);
                throw new Error(data.message || "Erreur lors de l'ajout du commentaire.");
              }

              return data;
            });
          })
          .then((data) => {
            if (data.success) {
              // Ajouter le nouveau commentaire au DOM sans recharger la page
              addCommentToDOM(data.comment);
              // Réinitialiser le formulaire
              commentForm.reset();
            } else {
              console.error("Erreur lors de l'ajout du commentaire:", data.message);
              showNotification('error', data.message || 'Une erreur est survenue.');
            }
            if (submitButton) {
              submitButton.disabled = false;
            }
          })
          .catch((error) => {
            console.error('Erreur réseau:', error);
            showNotification('error', error.message || 'Une erreur est survenue lors de la publication du commentaire.');
            if (submitButton) {
              submitButton.disabled = false;
            }
          });
      });
      commentForm.classList.add('listener-attached');
      console.log("Écouteur d'événement ajouté au formulaire de commentaire");
    } else {
      console.log("Écouteur déjà attaché au formulaire de commentaire");
    }
  }

  // Fonction pour ajouter un commentaire au DOM
  function addCommentToDOM(comment) {
    const commentList = document.querySelector('.comment-list');
    if (commentList) {
      const commentElement = document.createElement('div');
      commentElement.classList.add('comment');

      commentElement.innerHTML = `
        <div class="comment-header">
          <strong class="comment-username">${comment.username}</strong>
          <span class="comment-date">${new Date(comment.date).toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="comment-body comment-box">
          <p>${comment.comment}</p>
          ${
            comment.canDelete
              ? `
              <button type="button" class="delete-button" data-comment-id="${comment.id}" title="Supprimer ce commentaire">
                <i class="fa fa-trash"></i>
              </button>
            `
              : ''
          }
        </div>
        <div class="reactions">
          ${renderReactions(comment)}
        </div>
      `;

      commentList.prepend(commentElement);

      // Attacher les écouteurs aux boutons de réaction du nouveau commentaire
      const reactionButtons = commentElement.querySelectorAll('.reaction-button');
      reactionButtons.forEach((button) => {
        button.addEventListener('click', reactToComment);
      });

      // Attacher l'écouteur au bouton de suppression
      const deleteButton = commentElement.querySelector('.delete-button');
      if (deleteButton) {
        deleteButton.addEventListener('click', deleteItem);
      }
    }
  }

  // Fonction pour rendre les boutons de réaction
  function renderReactions(comment) {
    const reactions = ['👍', '💩', '❤️', '😂'];
    let html = '';
    reactions.forEach((emoji) => {
      const count = comment.reactions && comment.reactions[emoji] ? comment.reactions[emoji] : 0;
      const userHasReacted = comment.userReactions && comment.userReactions.includes(emoji);
      html += `
        <button
          type="button"
          class="reaction-button ${userHasReacted ? 'reacted' : ''}"
          data-comment-id="${comment.id}"
          data-emoji="${emoji}"
        >
          ${emoji} <span class="reaction-count">${count}</span>
        </button>
      `;
    });
    return html;
  }

  // Fonction pour gérer les réactions aux commentaires
  function reactToComment(event) {
    event.preventDefault();
    const button = event.currentTarget;
    button.disabled = true; // Désactiver le bouton pendant la requête

    const commentId = button.getAttribute('data-comment-id');
    const emoji = button.getAttribute('data-emoji');

    console.log('Réaction envoyée pour le commentaire ID:', commentId, 'avec emoji:', emoji);

    fetch(`/react/${commentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken, // Utiliser le jeton CSRF récupéré
      },
      body: JSON.stringify({ emoji }),
      credentials: 'include', // Inclure les cookies de session
    })
      .then((response) => {
        return response.text().then((text) => {
          let data;
          try {
            data = JSON.parse(text);
          } catch (error) {
            console.error('Erreur lors du parsing du JSON:', error);
            console.error('Réponse non JSON:', text);
            throw new Error('Réponse du serveur invalide.');
          }

          if (!response.ok) {
            console.error('Erreur du serveur:', data);
            throw new Error(data.message || 'Erreur lors de la mise à jour de la réaction.');
          }

          return data;
        });
      })
      .then((data) => {
        if (data.success) {
          // Mettre à jour le compteur de réactions
          button.querySelector('.reaction-count').textContent = data.updatedCount;
          button.classList.toggle('reacted', data.userHasReacted);
        } else {
          showNotification('error', data.message || 'Une erreur est survenue.');
        }
        button.disabled = false; // Réactiver le bouton
      })
      .catch((error) => {
        showNotification('error', error.message);
        console.error('Erreur:', error);
        button.disabled = false; // Réactiver le bouton
      });
  }

  // Attacher les événements aux boutons de réaction
  function attachReactionEventListeners() {
    const reactionButtons = document.querySelectorAll('.reaction-button');
    reactionButtons.forEach((button) => {
      if (!button.classList.contains('listener-attached')) {
        button.addEventListener('click', reactToComment);
        button.classList.add('listener-attached');
      }
    });
  }

  // Fonction pour gérer la suppression (commentaires et projets)
  function deleteItem(event) {
    event.preventDefault();
    const button = event.currentTarget;

    if (button.hasAttribute('data-comment-id')) {
      // Suppression d'un commentaire
      const commentId = button.getAttribute('data-comment-id');

      if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
        return;
      }

      button.disabled = true;
      button.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

      fetch(`/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, // Utiliser le jeton CSRF récupéré
        },
        credentials: 'include', // Inclure les cookies de session
      })
        .then((response) => {
          if (response.ok) {
            const commentElement = button.closest('.comment');
            if (commentElement) {
              commentElement.remove();
            }
          } else {
            console.error('Erreur lors de la suppression du commentaire.');
            button.disabled = false;
            button.innerHTML = '<i class="fa fa-trash"></i>';
          }
        })
        .catch((error) => {
          console.error('Erreur réseau :', error);
          button.disabled = false;
          button.innerHTML = '<i class="fa fa-trash"></i>';
        });
    } else if (button.hasAttribute('data-project-id')) {
      // Suppression d'un projet
      const projectId = button.getAttribute('data-project-id');

      if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        return;
      }

      button.disabled = true;
      button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Suppression...';

      fetch(`/projets/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, // Utiliser le jeton CSRF récupéré
        },
        credentials: 'include', // Inclure les cookies de session
      })
        .then((response) => {
          return response.text().then((text) => {
            if (response.ok) {
              window.location.href = '/projets';
            } else {
              console.error('Erreur du serveur:', text);
              throw new Error(text || 'Erreur lors de la suppression du projet.');
            }
          });
        })
        .catch((error) => {
          console.error('Erreur lors de la suppression du projet :', error);
          alert('Erreur lors de la suppression du projet : ' + error.message);
          button.disabled = false;
          button.innerHTML = '<i class="fa fa-trash"></i> Supprimer ce projet';
        });
    }
  }

  // Attacher l'événement aux boutons de suppression
  function attachDeleteEventListeners() {
    const deleteButtons = document.querySelectorAll('.delete-button, .delete-button2');
    deleteButtons.forEach((button) => {
      if (!button.classList.contains('listener-attached')) {
        button.addEventListener('click', deleteItem);
        button.classList.add('listener-attached');
      }
    });
  }

  // Appeler les fonctions après le chargement du contenu
  attachDeleteEventListeners();
  attachReactionEventListeners();

  // Fonction pour basculer l'affichage du menu déroulant
  function toggleDropdown(event) {
    event.stopPropagation(); // Empêche la fermeture immédiate du menu
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu) {
      dropdownMenu.classList.toggle('show'); // Bascule l'affichage du menu
    }
  }

  // Fonctionnalité du menu déroulant pour le nom d'utilisateur
  const usernameDropdown = document.getElementById('usernameDropdown');
  if (usernameDropdown) {
    if (!usernameDropdown.classList.contains('listener-attached')) {
      usernameDropdown.addEventListener('click', toggleDropdown);
      usernameDropdown.classList.add('listener-attached');
      console.log("Écouteur d'événement ajouté à usernameDropdown");
    } else {
      console.log("Écouteur déjà attaché à usernameDropdown");
    }
  } else {
    console.warn('Élément usernameDropdown non trouvé');
  }

  // Fermer le menu si l'utilisateur clique en dehors de celui-ci
  window.addEventListener('click', function (event) {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (
      dropdownMenu &&
      usernameDropdown &&
      !usernameDropdown.contains(event.target) &&
      !dropdownMenu.contains(event.target)
    ) {
      dropdownMenu.classList.remove('show'); // Cache le menu si on clique ailleurs
    }
  });

  function showNotification(type, message, callback, countdownSeconds) {
    const notification = document.getElementById('notification');
    if (!notification) {
      alert(message); // Fallback si l'élément n'existe pas
      if (callback) callback();
      return;
    }
    notification.className = 'notification'; // Réinitialiser les classes
    if (type === 'success') {
      notification.classList.add('success');
    } else if (type === 'error') {
      notification.classList.add('error');
    }
    notification.style.display = 'block';

    if (countdownSeconds && countdownSeconds > 0) {
      let remainingSeconds = countdownSeconds;
      const originalMessage = message;
      notification.textContent = `${message} Vous serez redirigé dans ${remainingSeconds} seconde(s).`;
      const intervalId = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds > 0) {
          notification.textContent = `${originalMessage} Vous serez redirigé dans ${remainingSeconds} seconde(s).`;
        } else {
          clearInterval(intervalId);
          notification.style.display = 'none';
          if (callback) callback();
        }
      }, 1000);
    } else {
      notification.textContent = message;
      // Masquer la notification après 3 secondes
      setTimeout(() => {
        notification.style.display = 'none';
        if (callback) callback();
      }, 3000);
    }
  }

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const changePasswordForm = document.getElementById('changePasswordForm');

  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const formData = new FormData(loginForm);
      const data = {
        username: formData.get('username'),
        password: formData.get('password'),
      };

      fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      })
        .then((response) => {
          return response.text().then((text) => {
            console.log('Response Status:', response.status);
            console.log('Response Headers:', [...response.headers.entries()]);
            console.log('Response Body:', text);

            let data;
            try {
              data = JSON.parse(text);
            } catch (error) {
              console.error('Erreur lors du parsing du JSON:', error);
              console.error('Réponse non JSON:', text);
              throw new Error('Réponse du serveur invalide.');
            }

            if (!response.ok) {
              console.error('Erreur du serveur:', data);
              throw new Error(data.message || 'Erreur lors de la connexion.');
            }

            return data;
          });
        })
        .then((data) => {
          if (data.success) {
            const countdownSeconds = 3; // Durée du compte à rebours en secondes
            showNotification(
              'success',
              'Connexion réussie !',
              () => {
                window.location.href = '/';
              },
              countdownSeconds
            );
          } else {
            if (data.errors) {
              const errorMessages = data.errors.map((err) => err.msg).join('<br>');
              showNotification('error', errorMessages);
            } else {
              showNotification('error', data.message || 'Une erreur est survenue.');
            }
          }
        })
        .catch((error) => {
          showNotification('error', error.message || 'Une erreur est survenue.');
          console.error('Erreur réseau:', error);
        });
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const formData = new FormData(registerForm);
      const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
      };

      fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, // Utiliser le jeton CSRF récupéré
        },
        body: JSON.stringify(data),
        credentials: 'include', // Inclure les cookies de session
      })
        .then((response) => {
          return response.text().then((text) => {
            let data;
            try {
              data = JSON.parse(text);
            } catch (error) {
              console.error('Erreur lors du parsing du JSON:', error);
              console.error('Réponse non JSON:', text);
              throw new Error('Réponse du serveur invalide.');
            }

            if (!response.ok) {
              console.error('Erreur du serveur:', data);
              throw new Error(data.message || 'Erreur lors de la création du compte.');
            }

            return data;
          });
        })
        .then((data) => {
          if (data.success) {
            const countdownSeconds = 3; // Durée du compte à rebours en secondes
            showNotification(
              'success',
              data.message,
              () => {
                window.location.href = '/login';
              },
              countdownSeconds
            );
          } else {
            if (data.errors) {
              const errorMessages = data.errors.map((err) => err.msg).join('<br>');
              showNotification('error', errorMessages);
            } else {
              showNotification('error', data.message || 'Une erreur est survenue.');
            }
          }
        })
        .catch((error) => {
          if (error && error.errors) {
            const errorMessages = error.errors.map((err) => err.msg).join('<br>');
            showNotification('error', errorMessages);
          } else {
            showNotification('error', error.message || 'Une erreur est survenue.');
          }
          console.error('Erreur réseau:', error);
        });
    });
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const formData = new FormData(changePasswordForm);
      const data = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
      };

      fetch('/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, // Utiliser le jeton CSRF récupéré
        },
        body: JSON.stringify(data),
        credentials: 'include', // Inclure les cookies de session
      })
        .then((response) => {
          return response.text().then((text) => {
            let data;
            try {
              data = JSON.parse(text);
            } catch (error) {
              console.error('Erreur lors du parsing du JSON:', error);
              console.error('Réponse non JSON:', text);
              throw new Error('Réponse du serveur invalide.');
            }

            if (!response.ok) {
              console.error('Erreur du serveur:', data);
              throw new Error(data.message || 'Erreur lors du changement de mot de passe.');
            }

            return data;
          });
        })
        .then((data) => {
          if (data.success) {
            const countdownSeconds = 3; // Durée du compte à rebours en secondes
            showNotification(
              'success',
              data.message,
              () => {
                if (data.redirect) {
                  window.location.href = data.redirect;
                }
              },
              countdownSeconds
            );
          } else {
            if (data.errors) {
              const errorMessages = data.errors.map((err) => err.msg).join('<br>');
              showNotification('error', errorMessages);
            } else {
              showNotification('error', data.message || 'Une erreur est survenue.');
            }
          }
        })
        .catch((error) => {
          if (error && error.errors) {
            const errorMessages = error.errors.map((err) => err.msg).join('<br>');
            showNotification('error', errorMessages);
          } else {
            showNotification('error', error.message || 'Une erreur est survenue.');
          }
          console.error('Erreur réseau:', error);
        });
    });
  }
});
