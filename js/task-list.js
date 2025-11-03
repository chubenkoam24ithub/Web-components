class TaskList extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.tasks = this.loadTasks();
        this.nextId = this.tasks.length ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
        this.editingId = null;
        this.justAddedId = null;
        this._currentEditHandlers = null;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

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
                    background-color: white;
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
                    cursor: text;
                }

                .edit-input {
                    flex: 1;
                    padding: 5px;
                    font-size: 16px;
                    border: 1px solid #4CAF50;
                    border-radius: 4px;
                }

                .edit-btn, .delete-btn {
                    background-color: #2196F3;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    margin-left: 5px;
                }

                .delete-btn {
                    background-color: #f44336;
                }

                .edit-btn:hover {
                    background-color: #0b7dda;
                }

                .delete-btn:hover {
                    background-color: #d32f2f;
                }

                .task-item.editing {
                    transform: scale(1.02);
                    box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
                }

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
        this.renderTasks();
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
        };

        this._dragStartHandler = (e) => {
            const item = e.target.closest('.task-item');
            if (item) {
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.dataset.id);
            }
        };

        this._dragOverHandler = (e) => e.preventDefault();

        this._dropHandler = (e) => {
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
        };

        this._dragEndHandler = () => {
            this.shadow.querySelectorAll('.task-item').forEach(item => item.classList.remove('dragging'));
        };

        addBtn.addEventListener('click', this._addHandler);
        input.addEventListener('keydown', this._keyHandler);
        container.addEventListener('dragstart', this._dragStartHandler);
        container.addEventListener('dragover', this._dragOverHandler);
        container.addEventListener('drop', this._dropHandler);
        container.addEventListener('dragend', this._dragEndHandler);
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : ''} ${this.editingId === task.id ? 'editing' : ''}`;
        div.dataset.id = task.id;
        div.draggable = true;

        const isEditing = this.editingId === task.id;
        div.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text" style="display: ${isEditing ? 'none' : 'block'}">${this.escapeHtml(task.text)}</span>
            <input type="text" class="edit-input" value="${this.escapeHtml(task.text)}" style="display: ${isEditing ? 'block' : 'none'}">
            <button class="edit-btn">Edit</obutton>
            <button class="delete-btn">Удалить</button>
        `;

        const checkbox = div.querySelector('input[type="checkbox"]');
        const textSpan = div.querySelector('.task-text');
        const editBtn = div.querySelector('.edit-btn');
        const deleteBtn = div.querySelector('.delete-btn');

        checkbox.addEventListener('change', () => this.toggleTask(task.id));
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
        editBtn.addEventListener('click', () => this.startEdit(task.id));
        textSpan.addEventListener('dblclick', () => this.startEdit(task.id));

        return div;
    }

    renderTasks() {
        const container = this.shadow.querySelector('#tasks-container');
        if (!container) return;

        const fragment = document.createDocumentFragment();
        this.tasks.forEach(task => fragment.appendChild(this.createTaskElement(task)));
        container.innerHTML = '';
        container.appendChild(fragment);

        if (this.editingId) {
            this.updateTaskItem(this.editingId);
            const editInput = this.shadow.querySelector(`[data-id="${this.editingId}"] .edit-input`);
            if (editInput) {
                editInput.focus();
                editInput.select();
            }
        }
    }

    updateTaskItem(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        const item = this.shadow.querySelector(`[data-id="${id}"]`);
        if (!item) return;

        item.classList.toggle('completed', task.completed);
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = task.completed;

        const textSpan = item.querySelector('.task-text');
        const editInput = item.querySelector('.edit-input');
        if (textSpan) textSpan.textContent = task.text;
        if (editInput) editInput.value = task.text;

        const isEditing = this.editingId === id;
        item.classList.toggle('editing', isEditing);
        if (textSpan) textSpan.style.display = isEditing ? 'none' : 'block';
        if (editInput) editInput.style.display = isEditing ? 'block' : 'none';

        item.classList.remove('added');
        void item.offsetWidth;
        if (this.justAddedId === id) {
            item.classList.add('added');
            this.justAddedId = null;
        }
    }

    addTask(text) {
        const task = { id: this.nextId++, text, completed: false };
        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.justAddedId = task.id;
        this.updateTaskItem(task.id);
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.updateTaskItem(id);
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        const item = this.shadow.querySelector(`[data-id="${id}"]`);
        if (item) item.remove();
    }

    startEdit(id) {
        this.editingId = id;
        this.updateTaskItem(id);
        const editInput = this.shadow.querySelector(`[data-id="${id}"] .edit-input`);
        if (editInput) {
            editInput.focus();
            editInput.select();

            const keyHandler = (e) => {
                if (e.key === 'Enter') this.saveEdit(id, editInput.value);
                else if (e.key === 'Escape') this.cancelEdit();
            };
            const blurHandler = () => this.saveEdit(id, editInput.value);

            editInput.addEventListener('keydown', keyHandler);
            editInput.addEventListener('blur', blurHandler);
            this._currentEditHandlers = { keyHandler, blurHandler, input: editInput };
        }
    }

    saveEdit(id, newText) {
        const task = this.tasks.find(t => t.id === id);
        if (task && newText.trim()) task.text = newText.trim();
        this.saveTasks();
        this.cancelEdit();
        this.updateTaskItem(id);
    }

    cancelEdit() {
        if (this._currentEditHandlers) {
            const { keyHandler, blurHandler, input } = this._currentEditHandlers;
            input.removeEventListener('keydown', keyHandler);
            input.removeEventListener('blur', blurHandler);
            this._currentEditHandlers = null;
        }
        this.editingId = null;
        this.renderTasks(); // Сброс отображения
    }

    reorderTasks(fromIndex, toIndex) {
        const [moved] = this.tasks.splice(fromIndex, 1);
        this.tasks.splice(toIndex, 0, moved);
        this.saveTasks();
        this.renderTasks();
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
        const addBtn = this.shadow.querySelector('#add-btn');
        const input = this.shadow.querySelector('#new-task-input');
        const container = this.shadow.querySelector('#tasks-container');

        if (addBtn && this._addHandler) addBtn.removeEventListener('click', this._addHandler);
        if (input && this._keyHandler) input.removeEventListener('keydown', this._keyHandler);
        if (container) {
            container.removeEventListener('dragstart', this._dragStartHandler);
            container.removeEventListener('dragover', this._dragOverHandler);
            container.removeEventListener('drop', this._dropHandler);
            container.removeEventListener('dragend', this._dragEndHandler);
        }

        if (this._currentEditHandlers) {
            const { keyHandler, blurHandler, input } = this._currentEditHandlers;
            if (input) {
                input.removeEventListener('keydown', keyHandler);
                input.removeEventListener('blur', blurHandler);
            }
            this._currentEditHandlers = null;
        }

        this.editingId = null;
        this.justAddedId = null;
        console.log('TaskList disconnected and cleaned up.');
    }
}

customElements.define('task-list', TaskList);
