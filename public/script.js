document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const scheduleTableContainer = document.getElementById('schedule-table');
    const loadingOverlay = document.getElementById('loading-overlay');
    const toastContainer = document.getElementById('toast-container');
    const themeToggle = document.getElementById('toggle-theme');
    const refreshButton = document.getElementById('refresh-schedule');
    const exportButton = document.getElementById('export-schedule');

    let activities = [];

    const DAYS_OF_WEEK = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

    // Определяем базовый URL для API
    const API_BASE_URL = window.location.origin;

    // Theme Management
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        showToast('success', 'Тема изменена', `Переключено на ${newTheme === 'dark' ? 'темную' : 'светлую'} тему`);
    }

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Loading Management
    function showLoading() {
        loadingOverlay.classList.add('show');
    }

    function hideLoading() {
        loadingOverlay.classList.remove('show');
    }

    // Toast Notifications
    function showToast(type, title, message, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconMap[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Show animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        const autoRemoveTimer = setTimeout(() => removeToast(toast), duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoRemoveTimer);
            removeToast(toast);
        });
    }

    function removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Data Management
    function loadFromLocalStorage() {
        const data = localStorage.getItem('activities');
        if (data) {
            try {
                activities = JSON.parse(data);
            } catch(e) {
                console.error('Ошибка парсинга localStorage', e);
                activities = [];
                showToast('error', 'Ошибка', 'Не удалось загрузить локальные данные');
            }
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('activities', JSON.stringify(activities));
    }

    // API Functions
    async function loadActivities() {
        showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}/api/activities`);
            if (!response.ok) throw new Error('Ошибка загрузки занятий');
            activities = await response.json();
            console.log('Данные успешно загружены с сервера:', activities);
            showToast('success', 'Успешно', 'Занятия загружены с сервера');
        } catch (error) {
            console.error('Ошибка загрузки с сервера:', error);
            showToast('warning', 'Предупреждение', 'Используются локальные данные');
            loadFromLocalStorage();
        } finally {
            hideLoading();
            renderSchedule();
        }
    }

    async function addActivity(activity) {
        showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}/api/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activity)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при добавлении занятия');
            }
            const savedActivity = await response.json();
            activities.push(savedActivity);
            console.log('Занятие добавлено:', savedActivity);
            showToast('success', 'Занятие добавлено', `"${activity.name}" успешно добавлено в расписание`);
        } catch (error) {
            showToast('error', 'Ошибка', error.message);
            console.error('Ошибка добавления:', error);
        } finally {
            hideLoading();
            saveToLocalStorage();
            renderSchedule();
        }
    }

    async function deleteActivity(id) {
        if (!confirm('Вы уверены, что хотите удалить это занятие?')) {
            return;
        }

        showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}/api/activities/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Ошибка при удалении занятия');
            
            const activityName = activities.find(a => a._id === id)?.name || 'Занятие';
            activities = activities.filter(a => a._id !== id);
            console.log('Занятие удалено:', id);
            showToast('success', 'Занятие удалено', `"${activityName}" удалено из расписания`);
        } catch (error) {
            showToast('error', 'Ошибка', error.message);
            console.error('Ошибка удаления:', error);
        } finally {
            hideLoading();
            saveToLocalStorage();
            renderSchedule();
        }
    }

    // Schedule Rendering
    function generateTimeSlots(startHour, endHour, intervalMinutes) {
        const slots = [];
        for (let hour = startHour; hour <= endHour; hour++) {
            for (let min = 0; min < 60; min += intervalMinutes) {
                if (hour === endHour && min > 30) break; // Stop at 20:30
                slots.push(`${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`);
            }
        }
        return slots;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function createTableHeader() {
        let headerHtml = '<tr><th>Время</th>';
        for(const day of DAYS_OF_WEEK){
            headerHtml += `<th>${day.charAt(0).toUpperCase() + day.slice(1)}</th>`;
        }
        headerHtml += '</tr>';
        return headerHtml;
    }

    function createTableRow(time) {
        let rowHtml = `<tr><td class="time-cell">${time}</td>`;
        for(const day of DAYS_OF_WEEK){
            const activity = findActivity(day, time);
            if(activity){
                rowHtml += `
                    <td class="activity-cell">
                        <div class="activity-name">${escapeHtml(activity.name)}</div>
                        <button class="delete-btn" data-id="${activity._id}" title="Удалить занятие">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            } else{
                rowHtml += '<td class="empty-cell"></td>';
            }
        }
        rowHtml += '</tr>';
        return rowHtml;
    }

    function findActivity(day, time) {
        return activities.find(a => a.day === day && a.time === time);
    }

    function renderSchedule() {
        const timeSlots = generateTimeSlots(9, 20, 30); 
        let html = '<table><thead>';
        html += createTableHeader();
        html += '</thead><tbody>';

        for(const time of timeSlots){
            html += createTableRow(time);
        }

        html += '</tbody></table>';
        
        scheduleTableContainer.innerHTML = html;
        
        // Add fade-in animation
        scheduleTableContainer.classList.add('fade-in');
        setTimeout(() => scheduleTableContainer.classList.remove('fade-in'), 500);
    }

    // Export Functionality
    function exportSchedule() {
        if (activities.length === 0) {
            showToast('warning', 'Нет данных', 'Нет занятий для экспорта');
            return;
        }

        const csvContent = generateCSV();
        downloadCSV(csvContent, 'schedule.csv');
        showToast('success', 'Экспорт завершен', 'Расписание сохранено в файл');
    }

    function generateCSV() {
        let csv = 'День недели,Время,Название,Длительность (мин)\n';
        activities.forEach(activity => {
            csv += `${activity.day},${activity.time},${activity.name},${activity.duration}\n`;
        });
        return csv;
    }

    function downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Form Validation
    function validateForm(formData) {
        const errors = [];

        if (!formData.name.trim()) {
            errors.push('Название занятия обязательно');
        }

        if (formData.name.length > 50) {
            errors.push('Название занятия не должно превышать 50 символов');
        }

        if (!formData.day) {
            errors.push('Выберите день недели');
        }

        if (!formData.time) {
            errors.push('Укажите время начала');
        }

        if (!formData.duration || formData.duration <= 0) {
            errors.push('Укажите корректную длительность');
        }

        // Check for time conflicts
        const existingActivity = findActivity(formData.day, formData.time);
        if (existingActivity) {
            errors.push('В это время уже запланировано другое занятие');
        }

        return errors;
    }

    // Event Listeners
    scheduleTableContainer.addEventListener('click', event => {
        if(event.target.closest('.delete-btn')){
            const btn = event.target.closest('.delete-btn');
            const id = btn.dataset.id;
            deleteActivity(id);
        }
    });

    document.getElementById('activity-form').addEventListener('submit', event => {
        event.preventDefault();

        const formData = {
            name: document.getElementById('activity-name').value.trim(),
            day: document.getElementById('day').value,
            time: document.getElementById('time').value,
            duration: parseInt(document.getElementById('duration').value, 10)
        };

        const errors = validateForm(formData);
        if (errors.length > 0) {
            showToast('error', 'Ошибка валидации', errors.join('. '));
            return;
        }

        addActivity(formData);
        event.target.reset();
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Refresh button
    refreshButton.addEventListener('click', () => {
        showToast('info', 'Обновление', 'Загружаем актуальные данные...');
        loadActivities();
    });

    // Export button
    exportButton.addEventListener('click', exportSchedule);

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + R for refresh
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            loadActivities();
        }
        
        // Ctrl/Cmd + E for export
        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
            event.preventDefault();
            exportSchedule();
        }
        
        // Ctrl/Cmd + D for theme toggle
        if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
            event.preventDefault();
            toggleTheme();
        }
    });

    // Form enhancements
    const activityNameInput = document.getElementById('activity-name');
    activityNameInput.addEventListener('input', (event) => {
        const value = event.target.value;
        const remaining = 50 - value.length;
        
        // Remove existing counter
        const existingCounter = event.target.parentNode.querySelector('.char-counter');
        if (existingCounter) {
            existingCounter.remove();
        }
        
        // Add character counter
        if (value.length > 40) {
            const counter = document.createElement('div');
            counter.className = 'char-counter';
            counter.style.cssText = 'font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;';
            counter.textContent = `Осталось символов: ${remaining}`;
            if (remaining < 0) {
                counter.style.color = 'var(--error-color)';
            }
            event.target.parentNode.appendChild(counter);
        }
    });

    // Auto-save form data
    const form = document.getElementById('activity-form');
    const formInputs = form.querySelectorAll('input, select');
    
    formInputs.forEach(input => {
        // Load saved values
        const savedValue = localStorage.getItem(`form_${input.id}`);
        if (savedValue && input.type !== 'submit') {
            input.value = savedValue;
        }
        
        // Save on change
        input.addEventListener('change', () => {
            localStorage.setItem(`form_${input.id}`, input.value);
        });
    });

    // Clear saved form data on successful submit
    form.addEventListener('submit', () => {
        setTimeout(() => {
            formInputs.forEach(input => {
                localStorage.removeItem(`form_${input.id}`);
            });
        }, 1000);
    });

    // Initialization
    console.log('Инициализация приложения, API URL:', API_BASE_URL);
    initTheme();
    loadActivities();

    // Service Worker registration for offline support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }

    // Handle online/offline status
    function updateOnlineStatus() {
        const status = navigator.onLine ? 'online' : 'offline';
        if (!navigator.onLine) {
            showToast('warning', 'Нет соединения', 'Приложение работает в автономном режиме');
        } else {
            showToast('success', 'Соединение восстановлено', 'Приложение снова онлайн');
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});