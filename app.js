/**
 * GTD Task Manager - JavaScript Application
 * Система управління завданнями з підтримкою GTD методології
 */

class GTDTaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.searchQuery = '';
        this.editingTaskId = null;
        
        this.init();
    }

    /**
     * Ініціалізація додатку
     */
    init() {
        this.loadTasks();
        this.bindEvents();
        this.renderTasks();
        this.updateStatistics();
        this.loadSampleData();
    }

    /**
     * Завантаження тестових даних при першому запуску
     */
    loadSampleData() {
        if (this.tasks.length === 0) {
            const sampleTask = {
                id: this.generateId(),
                title: "Підготувати презентацію для клієнта",
                description: "Створити презентацію з новими пропозиціями",
                priority: "Високий",
                category: "Робота",
                dueDate: "2025-06-01",
                context: "@Комп'ютер",
                tags: ["презентація", "клієнт"],
                status: "новий",
                createdAt: new Date().toISOString(),
                completedAt: null
            };
            
            this.tasks.push(sampleTask);
            this.saveTasks();
            this.renderTasks();
            this.updateStatistics();
        }
    }

    /**
     * Генерація унікального ID
     */
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Прив'язка подій до елементів інтерфейсу
     */
    bindEvents() {
        // Кнопка створення нового завдання
        document.getElementById('newTaskBtn').addEventListener('click', () => {
            this.openTaskModal();
        });

        // Навігація
        document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.setFilter(e.target.dataset.filter, e.target.dataset.value);
                this.setActiveNavItem(e.target);
            });
        });

        // Пошук
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTasks();
        });

        // Сортування
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderTasks();
        });

        // Модальні вікна
        this.bindModalEvents();

        // Клавіатурні скорочення
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Прив'язка подій модальних вікон
     */
    bindModalEvents() {
        const taskModal = document.getElementById('taskModal');
        const deleteModal = document.getElementById('deleteModal');
        
        // Закриття модальних вікон
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeTaskModal();
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeTaskModal();
        });
        
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.closeDeleteModal();
        });
        
        // Закриття при кліку поза модальним вікном
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) {
                this.closeTaskModal();
            }
        });
        
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                this.closeDeleteModal();
            }
        });

        // Форма завдання
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Підтвердження видалення
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.confirmDelete();
        });
    }

    /**
     * Встановлення фільтра
     */
    setFilter(filter, value = null) {
        this.currentFilter = filter;
        this.currentFilterValue = value;
        this.renderTasks();
        this.updateContentTitle();
    }

    /**
     * Встановлення активного пункту навігації
     */
    setActiveNavItem(activeItem) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    /**
     * Оновлення заголовка контенту
     */
    updateContentTitle() {
        const titleMap = {
            'all': 'Усі завдання',
            'inbox': 'Вхідні',
            'next': 'Наступні дії',
            'waiting': 'В очікуванні',
            'someday': 'Можливо колись',
            'category': `Категорія: ${this.currentFilterValue}`,
            'priority': `Пріоритет: ${this.currentFilterValue}`
        };
        
        document.getElementById('contentTitle').textContent = titleMap[this.currentFilter] || 'Завдання';
    }

    /**
     * Фільтрація завдань
     */
    filterTasks(tasks) {
        let filtered = tasks;

        // Фільтр пошуку
        if (this.searchQuery) {
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(this.searchQuery) ||
                task.description.toLowerCase().includes(this.searchQuery) ||
                task.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
            );
        }

        // GTD фільтри
        switch (this.currentFilter) {
            case 'inbox':
                filtered = filtered.filter(task => task.status === 'новий');
                break;
            case 'next':
                filtered = filtered.filter(task => 
                    task.status !== 'виконаний' && 
                    task.context !== '@Очікуємо' && 
                    task.context !== '@Можливо'
                );
                break;
            case 'waiting':
                filtered = filtered.filter(task => task.context === '@Очікуємо');
                break;
            case 'someday':
                filtered = filtered.filter(task => task.context === '@Можливо');
                break;
            case 'category':
                filtered = filtered.filter(task => task.category === this.currentFilterValue);
                break;
            case 'priority':
                filtered = filtered.filter(task => task.priority === this.currentFilterValue);
                break;
        }

        return filtered;
    }

    /**
     * Сортування завдань
     */
    sortTasks(tasks) {
        return tasks.sort((a, b) => {
            switch (this.currentSort) {
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                
                case 'priority':
                    const priorityOrder = { 'Високий': 3, 'Середній': 2, 'Низький': 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                
                case 'status':
                    const statusOrder = { 'новий': 1, 'в роботі': 2, 'виконаний': 3 };
                    return statusOrder[a.status] - statusOrder[b.status];
                
                default: // 'created'
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });
    }

    /**
     * Рендеринг списку завдань
     */
    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const filteredTasks = this.filterTasks(this.tasks);
        const sortedTasks = this.sortTasks(filteredTasks);

        if (sortedTasks.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = sortedTasks.map(task => this.renderTaskCard(task)).join('');
        
        // Додавання обробників подій для кнопок завдань
        this.bindTaskEvents();
    }

    /**
     * Рендеринг порожнього стану
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state__icon">📝</div>
                <h3 class="empty-state__title">Немає завдань</h3>
                <p class="empty-state__text">Створіть нове завдання, щоб почати</p>
            </div>
        `;
    }

    /**
     * Рендеринг картки завдання
     */
    renderTaskCard(task) {
        const isCompleted = task.status === 'виконаний';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
        const priorityClass = task.priority.toLowerCase();

        return `
            <div class="task-card ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} fade-in" data-task-id="${task.id}">
                <div class="task-card__header">
                    <h3 class="task-card__title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-card__actions">
                        <button class="task-card__btn task-card__btn--complete" data-action="toggle" title="${isCompleted ? 'Відмітити як невиконане' : 'Відмітити як виконане'}">
                            ${isCompleted ? '↶' : '✓'}
                        </button>
                        <button class="task-card__btn task-card__btn--edit" data-action="edit" title="Редагувати">
                            ✎
                        </button>
                        <button class="task-card__btn task-card__btn--delete" data-action="delete" title="Видалити">
                            🗑
                        </button>
                    </div>
                </div>
                
                ${task.description ? `<p class="task-card__description">${this.escapeHtml(task.description)}</p>` : ''}
                
                <div class="task-card__meta">
                    <div class="task-meta__item">
                        <span class="priority-badge priority-badge--${priorityClass}">${task.priority}</span>
                    </div>
                    <div class="task-meta__item">
                        <span>${task.category}</span>
                    </div>
                    <div class="task-meta__item">
                        <span class="context-badge">${task.context}</span>
                    </div>
                    ${task.dueDate ? `
                        <div class="task-meta__item">
                            <span>📅 ${this.formatDate(task.dueDate)}</span>
                        </div>
                    ` : ''}
                    ${task.tags.length > 0 ? `
                        <div class="tags-list">
                            ${task.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Прив'язка подій для завдань
     */
    bindTaskEvents() {
        document.querySelectorAll('.task-card__btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = e.target.closest('.task-card').dataset.taskId;
                const action = e.target.dataset.action;

                switch (action) {
                    case 'toggle':
                        this.toggleTaskStatus(taskId);
                        break;
                    case 'edit':
                        this.editTask(taskId);
                        break;
                    case 'delete':
                        this.deleteTask(taskId);
                        break;
                }
            });
        });
    }

    /**
     * Перемикання статусу завдання
     */
    toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (task.status === 'виконаний') {
                task.status = 'новий';
                task.completedAt = null;
            } else {
                task.status = 'виконаний';
                task.completedAt = new Date().toISOString();
            }
            this.saveTasks();
            this.renderTasks();
            this.updateStatistics();
        }
    }

    /**
     * Відкриття модального вікна завдання
     */
    openTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        const title = document.getElementById('modalTitle');

        if (task) {
            title.textContent = 'Редагувати завдання';
            this.editingTaskId = task.id;
            this.fillTaskForm(task);
        } else {
            title.textContent = 'Нове завдання';
            this.editingTaskId = null;
            form.reset();
        }

        modal.classList.add('show');
        document.getElementById('taskTitle').focus();
    }

    /**
     * Заповнення форми завдання
     */
    fillTaskForm(task) {
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskCategory').value = task.category;
        document.getElementById('taskDueDate').value = task.dueDate;
        document.getElementById('taskContext').value = task.context;
        document.getElementById('taskTags').value = task.tags.join(', ');
    }

    /**
     * Закриття модального вікна завдання
     */
    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        modal.classList.remove('show');
        this.editingTaskId = null;
    }

    /**
     * Збереження завдання
     */
    saveTask() {
        const formData = this.getFormData();
        
        if (!formData.title.trim()) {
            alert('Назва завдання є обов\'язковою');
            return;
        }

        if (this.editingTaskId) {
            // Редагування існуючого завдання
            const taskIndex = this.tasks.findIndex(t => t.id === this.editingTaskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...formData };
            }
        } else {
            // Створення нового завдання
            const newTask = {
                id: this.generateId(),
                ...formData,
                status: 'новий',
                createdAt: new Date().toISOString(),
                completedAt: null
            };
            this.tasks.push(newTask);
        }

        this.saveTasks();
        this.renderTasks();
        this.updateStatistics();
        this.closeTaskModal();
    }

    /**
     * Отримання даних з форми
     */
    getFormData() {
        return {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            category: document.getElementById('taskCategory').value,
            dueDate: document.getElementById('taskDueDate').value,
            context: document.getElementById('taskContext').value,
            tags: document.getElementById('taskTags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
        };
    }

    /**
     * Редагування завдання
     */
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.openTaskModal(task);
        }
    }

    /**
     * Видалення завдання
     */
    deleteTask(taskId) {
        this.taskToDelete = taskId;
        document.getElementById('deleteModal').classList.add('show');
    }

    /**
     * Підтвердження видалення
     */
    confirmDelete() {
        if (this.taskToDelete) {
            this.tasks = this.tasks.filter(t => t.id !== this.taskToDelete);
            this.saveTasks();
            this.renderTasks();
            this.updateStatistics();
            this.taskToDelete = null;
        }
        this.closeDeleteModal();
    }

    /**
     * Закриття модального вікна видалення
     */
    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('show');
        this.taskToDelete = null;
    }

    /**
     * Закриття всіх модальних вікон
     */
    closeAllModals() {
        this.closeTaskModal();
        this.closeDeleteModal();
    }

    /**
     * Оновлення статистики
     */
    updateStatistics() {
        const counts = {
            all: this.tasks.length,
            inbox: this.tasks.filter(t => t.status === 'новий').length,
            next: this.tasks.filter(t => 
                t.status !== 'виконаний' && 
                t.context !== '@Очікуємо' && 
                t.context !== '@Можливо'
            ).length,
            waiting: this.tasks.filter(t => t.context === '@Очікуємо').length,
            someday: this.tasks.filter(t => t.context === '@Можливо').length,
            completed: this.tasks.filter(t => t.status === 'виконаний').length,
            overdue: this.tasks.filter(t => 
                t.dueDate && 
                new Date(t.dueDate) < new Date() && 
                t.status !== 'виконаний'
            ).length,
            total: this.tasks.length
        };

        // Оновлення лічильників навігації
        document.getElementById('allCount').textContent = counts.all;
        document.getElementById('inboxCount').textContent = counts.inbox;
        document.getElementById('nextCount').textContent = counts.next;
        document.getElementById('waitingCount').textContent = counts.waiting;
        document.getElementById('somedayCount').textContent = counts.someday;

        // Оновлення аналітики
        document.getElementById('completedCount').textContent = counts.completed;
        document.getElementById('overdueCount').textContent = counts.overdue;
        document.getElementById('totalCount').textContent = counts.total;
    }

    /**
     * Збереження завдань в localStorage
     */
    saveTasks() {
        try {
            localStorage.setItem('gtd-tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Помилка збереження:', error);
        }
    }

    /**
     * Завантаження завдань з localStorage
     */
    loadTasks() {
        try {
            const saved = localStorage.getItem('gtd-tasks');
            if (saved) {
                this.tasks = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Помилка завантаження:', error);
            this.tasks = [];
        }
    }

    /**
     * Форматування дати
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Екранування HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Ініціалізація додатку після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    window.gtdManager = new GTDTaskManager();
});

// Експорт/імпорт функціональності
window.exportTasks = function() {
    const data = JSON.stringify(window.gtdManager.tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gtd-tasks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.importTasks = function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTasks = JSON.parse(e.target.result);
            if (Array.isArray(importedTasks)) {
                window.gtdManager.tasks = importedTasks;
                window.gtdManager.saveTasks();
                window.gtdManager.renderTasks();
                window.gtdManager.updateStatistics();
                alert('Завдання успішно імпортовано!');
            } else {
                alert('Неправильний формат файлу');
            }
        } catch (error) {
            alert('Помилка читання файлу');
        }
    };
    reader.readAsText(file);
};