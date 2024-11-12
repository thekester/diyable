// script.js

// DOMContentLoaded pour s'assurer que le script s'exécute après le chargement de la page
document.addEventListener('DOMContentLoaded', function () {
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
      headers: { 'Content-Type': 'application/json' },
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

  // Fonction pour rendre les boutons de réaction et attacher les événements
  function renderReactions(comment) {
    const reactions = ['👍', '💩', '❤️', '😂'];
    let html = '';
    reactions.forEach((emoji) => {
      const count = comment.reactions && comment.reactions[emoji] ? comment.reactions[emoji] : 0;
      html += `<button
          type="button"
          class="reaction-button"
          data-comment-id="${comment.id}"
          data-emoji="${emoji}"
        >${emoji} <span class="reaction-count">${count}</span></button> `;
    });
    return html;
  }

  // Attacher les événements aux boutons de réaction
  function attachReactionEventListeners() {
    const reactionButtons = document.querySelectorAll('.reaction-button');
    reactionButtons.forEach((button) => {
      button.addEventListener('click', reactToComment);
    });
  }

    // Fonction pour gérer la suppression d'un commentaire
  function deleteComment(event) {
    const button = event.currentTarget;
    const commentId = button.getAttribute('data-comment-id');

    fetch(`/comments/${commentId}`, {
      method: 'DELETE',
    })
      .then((response) => {
        if (response.ok) {
          const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
          if (commentElement) {
            commentElement.remove();
          }
        } else {
          return response.text().then((message) => {
            console.error('Erreur lors de la suppression du commentaire:', message);
          });
        }
      })
      .catch((error) => {
        console.error('Erreur réseau:', error);
      });
  }

  // Attacher les événements aux boutons de suppression
  function attachDeleteCommentEventListeners() {
    const deleteButtons = document.querySelectorAll('.delete-comment-button');
    deleteButtons.forEach((button) => {
      button.addEventListener('click', deleteComment);
    });
  }

  // Appeler les fonctions d'attachement après le rendu des commentaires
  attachDeleteCommentEventListeners();

  // Appeler la fonction pour attacher les événements après le chargement initial
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
});
