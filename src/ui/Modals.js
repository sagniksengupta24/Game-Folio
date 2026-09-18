export class Modals {
  constructor() {
    this.projectDialog = document.getElementById('project-dialog');
    this.contactDialog = document.getElementById('contact-dialog');
    this.helpDialog = document.getElementById('help-dialog');

    this.initLightDismissFallback(this.projectDialog);
    this.initLightDismissFallback(this.contactDialog);
    this.initLightDismissFallback(this.helpDialog);

    this.setupCloseButtons();
    this.setupContactForm();
  }

  initLightDismissFallback(dialog) {
    if (!dialog) return;
    // Fallback for browsers that do not support closedby="any"
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInDialog =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isInDialog) {
          dialog.close();
        }
      });
    }
  }

  setupCloseButtons() {
    document.querySelectorAll('[data-dialog-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dialog = btn.closest('dialog');
        if (dialog && typeof dialog.close === 'function') {
          dialog.close();
        }
      });
    });

    const helpBtn = document.getElementById('btn-help');
    if (helpBtn && this.helpDialog) {
      helpBtn.addEventListener('click', () => {
        this.helpDialog.showModal();
      });
    }
  }

  setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('contact-status');
      if (statusEl) {
        statusEl.textContent = '✓ Message transmitted successfully!';
        statusEl.style.color = '#10b981';
      }
      setTimeout(() => {
        form.reset();
        if (this.contactDialog) this.contactDialog.close();
        if (statusEl) statusEl.textContent = '';
      }, 1600);
    });
  }

  openProject(project) {
    if (!this.projectDialog || !project) return;

    const titleEl = document.getElementById('modal-project-title');
    const catEl = document.getElementById('modal-project-category');
    const descEl = document.getElementById('modal-project-desc');
    const tagsEl = document.getElementById('modal-project-tags');
    const demoBtn = document.getElementById('modal-project-demo');
    const githubBtn = document.getElementById('modal-project-github');

    if (titleEl) titleEl.textContent = project.title;
    if (catEl) catEl.textContent = `${project.category} • ${project.year}`;
    if (descEl) descEl.textContent = project.description;

    if (tagsEl) {
      tagsEl.innerHTML = '';
      project.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.className = 'tech-tag';
        span.textContent = tag;
        tagsEl.appendChild(span);
      });
    }

    if (demoBtn) demoBtn.href = project.demoUrl;
    if (githubBtn) githubBtn.href = project.githubUrl;

    this.projectDialog.showModal();
  }

  openContact() {
    if (!this.contactDialog) return;
    this.contactDialog.showModal();
  }
}
