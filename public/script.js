// script.js

// DOMContentLoaded pour s'assurer que le script s'exécute après le chargement de la page
document.addEventListener('DOMContentLoaded', function () {
  // Sélection des boutons de filtre
  const filterButtons = document.querySelectorAll('.filter-button');
  const projectCards = document.querySelectorAll('.project-card');
  const noProjectsMessage = document.getElementById('no-projects-message');

  // Vérifiez que les boutons existent avant de tenter d'accéder à leurs propriétés
  if (filterButtons && filterButtons.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', function () {
        const category = this.dataset.category;

        // Gestion de la classe active
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        // Compteur pour les projets visibles
        let projectsVisible = 0;

        // Vérifiez que les cartes existent également
        if (projectCards && projectCards.length > 0) {
          projectCards.forEach(card => {
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
    console.warn("Aucun bouton de filtre trouvé sur la page.");
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
    console.warn("Aucun bouton héro trouvé sur la page.");
  }

  // Fonctionnalité du menu déroulant pour le nom d'utilisateur
  const usernameDropdown = document.getElementById('usernameDropdown');
  if (usernameDropdown) {
    usernameDropdown.addEventListener('click', toggleDropdown);
  }

  // Fermer le menu si l'utilisateur clique en dehors de celui-ci
  window.addEventListener('click', function(event) {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu && usernameDropdown && !usernameDropdown.contains(event.target) && !dropdownMenu.contains(event.target)) {
      dropdownMenu.style.display = 'none'; // Cache le menu si on clique ailleurs
    }
  });

  // Gestion de l'affichage des commentaires des projets
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', async function(event) {
      event.preventDefault(); // Empêche la soumission classique du formulaire
      const formData = new FormData(this);
      const response = await fetch(this.action, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const projectId = formData.get('projectId');
        const newComments = await fetch(`/comments/${projectId}`).then(res => res.json());
        const commentList = document.querySelector('.comment-list');
        commentList.innerHTML = ''; // Nettoie la liste des commentaires
        newComments.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.classList.add('comment');
          commentDiv.innerHTML = `
            <div class="comment-header">
              <strong class="comment-username">${comment.username}</strong>
              <span class="comment-date">${new Date(comment.date).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="comment-body comment-box">
              <p>${comment.comment}</p>
            </div>
            <div class="reactions">
              ${renderReactions(comment)}
            </div>
          `;
          commentList.appendChild(commentDiv);
        });
        this.reset(); // Réinitialise le formulaire
      } else {
        alert('Erreur lors de l\'envoi du commentaire.');
      }
    });
  }
});

// Fonction pour basculer l'affichage du menu déroulant
function toggleDropdown() {
  const dropdownMenu = document.getElementById('dropdownMenu');
  // Vérifiez si le menu est actuellement visible
  if (dropdownMenu.style.display === 'flex' || dropdownMenu.style.display === 'block') {
    dropdownMenu.style.display = 'none'; // Cache le menu
  } else {
    dropdownMenu.style.display = 'flex'; // Affiche le menu
  }
}

// Fonction pour gérer les réactions aux commentaires
// Fonction pour gérer les réactions aux commentaires
function reactToComment(event) {
  event.preventDefault();
  const button = event.target;
  const commentId = button.getAttribute('data-comment-id');
  const emoji = button.getAttribute('data-emoji');

  fetch(`/react/${commentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji })
  })
  .then(response => response.json())
  .then(data => {
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
  .catch(error => {
    console.error('Erreur réseau:', error);
  });
}


// Fonction pour rendre les boutons de réaction
function renderReactions(comment) {
  const reactions = ['👍', '💩', '❤️', '😂'];
  let html = '';
  reactions.forEach(emoji => {
    const count = comment.reactions && comment.reactions[emoji] ? comment.reactions[emoji] : 0;
    html += `<button
      type="button"
      class="reaction-button"
      data-comment-id="${comment.id}"
      data-emoji="${emoji}"
      onclick="reactToComment(event)"
    >${emoji} <span class="reaction-count">${count}</span></button> `;
  });
  return html;
}
