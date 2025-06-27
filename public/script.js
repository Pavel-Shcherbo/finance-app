document.addEventListener('DOMContentLoaded', () => {
    const scheduleTableContainer = document.getElementById('schedule-table');
    let activities = [];

    const DAYS_OF_WEEK = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
    const API_BASE_URL = window.location.origin;

    function loadFromLocalStorage() {
        const data = localStorage.getItem('activities');
        if (data) {
            try {
                activities = JSON.parse(data);
            } catch(e) {
                console.error('Ошибка парсинга localStorage', e);
                activities = [];
            }
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('activities', JSON.stringify(activities));
    }

    async function loadActivities() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/activities`);
            if (!response.ok) throw new Error('Ошибка загрузки занятий');
            activities = await response.json();
            console.log('Данные успешно загружены с сервера:', activities);
        } catch (error) {
            console.error('Ошибка загрузки с сервера:', error);
            loadFromLocalStorage();
        }
        renderSchedule();
    }

    async function addActivity(activity) {
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
        } catch (error) {
            alert(error.message);
            console.error('Ошибка добавления:', error);
        }
        saveToLocalStorage();
        renderSchedule();
    }

    async function deleteActivity(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/activities/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Ошибка при удалении занятия');
            activities = activities.filter(a => a._id !== id);
            console.log('Занятие удалено:', id);
        } catch (error) {
            alert(error.message);
            console.error('Ошибка удаления:', error);
        }
        saveToLocalStorage();
        renderSchedule();
    }

    function generateTimeSlots(startHour, endHour, intervalMinutes) {
        const slots = [];
        for (let hour = startHour; hour <= endHour; hour++) {
            for (let min = 0; min < 60; min += intervalMinutes) {
                if (hour === endHour && min > 30) break;
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
        let headerHtml = '<tr><th class="time-cell">Время</th>';
        for(const day of DAYS_OF_WEEK) {
            headerHtml += `<th>${day.charAt(0).toUpperCase() + day.slice(1)}</th>`;
        }
        headerHtml += '</tr>';
        return headerHtml;
    }

    function createTableRow(time) {
        let rowHtml = `<tr><td class="time-cell">${time}</td>`;
        for(const day of DAYS_OF_WEEK) {
            const activity = findActivity(day, time);
            if(activity) {
                rowHtml += `<td class="activity-cell">
                    <div class="activity-content">
                        <span>${escapeHtml(activity.name)}</span>
                        <button class="delete-btn" data-id="${activity._id}">×</button>
                    </div>
                </td>`;
            } else {
                rowHtml += '<td></td>';
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

        for(const time of timeSlots) {
            html += createTableRow(time);
        }

        html += '</tbody></table>';
        scheduleTableContainer.innerHTML = html;
    }

    scheduleTableContainer.addEventListener('click', event => {
        if(event.target.classList.contains('delete-btn')) {
            const id = event.target.dataset.id;
            if(confirm('Удалить это занятие?')) {
                deleteActivity(id);
            }
        }
    });

    document.getElementById('activity-form').addEventListener('submit', event => {
        event.preventDefault();

        const nameInput = document.getElementById('activity-name');
        const daySelect = document.getElementById('day');
        const timeInput = document.getElementById('time');
        const durationInput = document.getElementById('duration');

        const name = nameInput.value.trim();
        const day = daySelect.value;
        const timeValue = timeInput.value; 
        const durationMinutes = parseInt(durationInput.value, 10);

        if(!name || !day || !timeValue || isNaN(durationMinutes) || durationMinutes <= 0) {
            alert('Пожалуйста, заполните все поля корректно.');
            return;
        }

        addActivity({name, day, time: timeValue, duration: durationMinutes});
        event.target.reset();
    });

    console.log('Инициализация приложения, API URL:', API_BASE_URL);
    loadActivities();
});