// script.js

document.addEventListener('DOMContentLoaded', function () {
  // Récupérer le jeton CSRF depuis la balise meta
  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

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
    commentForm.addEventListener('submit', function (event) {
      // Pas de prévention de l'action par défaut ici, car le formulaire sera soumis et la page rechargée
    });
  }

  // Fonction pour gérer les réactions aux commentaires
  function reactToComment(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const commentId = button.getAttribute('data-comment-id');
    const emoji = button.getAttribute('data-emoji');

    fetch(`/react/${commentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ emoji }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Mettre à jour le compteur de réactions sans recharger la page
          const count = data.updatedCount;
          button.querySelector('.reaction-count').textContent = count;

          // Gérer l'état actif du bouton pour indiquer que l'utilisateur a réagi ou non
          if (data.userHasReacted) {
            button.classList.add('reacted');
          } else {
            button.classList.remove('reacted');
          }
        } else {
          console.error('Erreur lors de la mise à jour de la réaction.', data.message);
        }
      })
      .catch((error) => {
        console.error('Erreur réseau:', error);
      });
  }

  // Attacher les événements aux boutons de réaction
  function attachReactionEventListeners() {
    const reactionButtons = document.querySelectorAll('.reaction-button');
    reactionButtons.forEach((button) => {
      button.addEventListener('click', reactToComment);
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
          'Accept': 'application/json',
          'CSRF-Token': csrfToken,
        },
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
          'Accept': 'application/json',
          'CSRF-Token': csrfToken,
        },
      })
        .then((response) => {
          if (response.ok) {
            window.location.href = '/projets';
          } else {
            return response.text().then((text) => {
              throw new Error(text);
            });
          }
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
      button.addEventListener('click', deleteItem);
    });
  }

  // Appeler les fonctions après le chargement du contenu
  attachDeleteEventListeners();
  attachReactionEventListeners();

  // Fonction pour basculer l'affichage du menu déroulant
  function toggleDropdown(event) {
    event.stopPropagation(); // Empêche la propagation de l'événement pour éviter de fermer le menu immédiatement
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu) {
      dropdownMenu.classList.toggle('show'); // Bascule l'affichage du menu
    }
  }

  // Fonctionnalité du menu déroulant pour le nom d'utilisateur
  const usernameDropdown = document.getElementById('usernameDropdown');
  if (usernameDropdown) {
    usernameDropdown.addEventListener('click', toggleDropdown);
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
          'Accept': 'application/json',
          'CSRF-Token': csrfToken,
        },
        body: JSON.stringify(data),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((data) => {
              throw data;
            });
          }
          return response.json();
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
          'Accept': 'application/json',
          'CSRF-Token': csrfToken,
        },
        body: JSON.stringify(data),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((data) => {
              throw data;
            });
          }
          return response.json();
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
          'Accept': 'application/json',
          'CSRF-Token': csrfToken,
        },
        body: JSON.stringify(data),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((data) => {
              throw data;
            });
          }
          return response.json();
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
