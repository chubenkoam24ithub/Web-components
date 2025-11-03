class TaskList extends HTMLElement {
    constructor() {
        super();
        // Прикрепляем Shadow DOM для инкапсуляции
        this.shadow = this.attachShadow({ mode: 'open' });
        this.tasks = this.loadTasks(); // Загрузка из localStorage
        this.nextId = this.tasks.length ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    // Полный рендер шаблона в Shadow DOM
    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 20px;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    background-color: #f9f9f9;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .add-task {
                    display: flex;
                    margin-bottom: 20px;
                }

                .add-task input {
                    flex: 1;
                    padding: 10px;
                    font-size: 16px;
                    border: 1px solid #ddd;
                    border-radius: 4px 0 0 4px;
                }

                .add-task button {
                    padding: 10px 20px;
                    font-size: 16px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 0 4px 4px 0;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .add-task button:hover {
                    background-color: #45a049;
                }

                .tasks-container {
                    position: relative;
                }

                .task-item {
                    display: flex;
                    align-items: center;
                    padding: 10px;
381                    background-color: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-bottom: 10px;
                    cursor: move;
                    transition: all 0.3s ease;
                    opacity: 1;
                    transform: translateY(0);
                }

                .task-item.dragging {
                    opacity: 0.5;
                    background-color: #e0e0e0;
                }

                .task-item.completed {
                    opacity: 0.7;
                    text-decoration: line-through;
                    background-color: #f0f0f0;
                }

                .task-item input[type="checkbox"] {
                    margin-right: 10px;
                }

                .task-text {
                    flex: 1;
                    font-size: 16px;
                }

                .delete-btn {
                    background-color: #f44336;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .delete-btn:hover {
                    background-color: #d32f2f;
                }

                /* Анимации */
                .task-item.added {
                    animation: fadeIn 0.5s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>

            <div class="add-task">
                <input type="text" placeholder="Новая задача" id="new-task-input">
                <button id="add-btn">Добавить</button>
            </div>
            <div class="tasks-container" id="tasks-container"></div>
        `;
        this.renderTasks(); // Начальный рендер задач
    }

    setupEventListeners() {
        const addBtn = this.shadow.querySelector('#add-btn');
        const input = this.shadow.querySelector('#new-task-input');
        const container = this.shadow.querySelector('#tasks-container');

        this._addHandler = () => {
            const text = input.value.trim();
            if (text) {
                this.addTask(text);
                input.value = '';
            }
        };

        this._keyHandler = (e) => {
            if (e.key === 'Enter') this._addHandler();
859        };

        addBtn.addEventListener('click', this._addHandler);
        input.addEventListener('keydown', this._keyHandler);

        // Drag-and-Drop
        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-item')) {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
            }
        });

        container.addEventListener('dragover', (e) => e.preventDefault());

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
            const draggedTask = this.shadow.querySelector(`[data-id="${draggedId}"]`);
            const dropTarget = e.target.closest('.task-item');
            if (dropTarget && dropTarget !== draggedTask) {
                const allTasks = Array.from(this.shadow.querySelectorAll('.task-item'));
                const draggedIndex = allTasks.indexOf(draggedTask);
                const targetIndex = allTasks.indexOf(dropTarget);
                this.reorderTasks(draggedIndex, targetIndex);
            }
            this.shadow.querySelectorAll('.task-item').forEach(item => item.classList.remove('dragging'));
        });

        container.addEventListener('dragend', () => {
            this.shadow.querySelectorAll('.task-item').forEach(item => item.classList.remove('dragging'));
        });
    }

    addTask(text) {
        const task = {
            id: this.nextId++,
            text,
            completed: false
        };
        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks(); // Оптимизировано: только список
        // Анимация для новой задачи
        const newItem = this.shadow.querySelector(`[data-id="${task.id}"]`);
        if (newItem) newItem.classList.add('added');
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks(); // Можно оптимизировать до update одного элемента
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
    }

    reorderTasks(fromIndex, toIndex) {
        const [moved] = this.tasks.splice(fromIndex, 1);
        this.tasks.splice(toIndex, 0, moved);
        this.saveTasks();
        this.renderTasks();
    }

    renderTasks() {
        const container = this.shadow.querySelector('#tasks-container');
        if (!container) return;

        const fragment = document.createDocumentFragment();

        this.tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            div.dataset.id = task.id;
            div.draggable = true;

            div.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <button class="delete-btn">Удалить</button>
            `;

            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => this.toggleTask(task.id));

            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

            fragment.appendChild(div);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveTasks() {
        localStorage.setItem('taskListTasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const saved = localStorage.getItem('taskListTasks');
        return saved ? JSON.parse(saved) : [];
    }

    disconnectedCallback() {
        // Чистка слушателей (если нужно расширить)
    }
}

customElements.define('task-list', TaskList);