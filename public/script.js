document.addEventListener('DOMContentLoaded', () => {
    // Удалена переменная activityForm как указано в предупреждении
    const scheduleTableContainer = document.getElementById('schedule-table');

    let activities = [];

    const DAYS_OF_WEEK = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

    // Загрузка данных из localStorage при старте
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

    // Сохранение данных в localStorage
    function saveToLocalStorage() {
        localStorage.setItem('activities', JSON.stringify(activities));
    }

    // Загрузка занятий с сервера и из localStorage
    async function loadActivities() {
        try {
            const response = await fetch('http://localhost:3000/api/activities');
            if (!response.ok) throw new Error('Ошибка загрузки занятий');
            activities = await response.json();
        } catch (error) {
            console.error(error);
            alert('Не удалось загрузить занятия с сервера. Используются локальные данные.');
        }
        loadFromLocalStorage(); // Перезаписываем локальные данные после получения с сервера
        renderSchedule();
    }

    // Добавление нового занятия через API и локальное хранилище
    async function addActivity(activity) {
        try {
            const response = await fetch('http://localhost:3000/api/activities', {
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
        } catch (error) {
            alert(error.message);
            console.error(error);
        }
        saveToLocalStorage();
        renderSchedule();
    }

    // Удаление занятия через API и локальное хранилище
    async function deleteActivity(id) {
        try {
            const response = await fetch(`http://localhost:3000/api/activities/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Ошибка при удалении занятия');
            activities = activities.filter(a => a._id !== id);
        } catch (error) {
            alert(error.message);
            console.error(error);
        }
        saveToLocalStorage();
        renderSchedule();
    }

    // Генерация временных слотов с 9:00 до 20:30 с шагом 30 минут
    function generateTimeSlots(startHour, endHour, intervalMinutes) {
        const slots = [];
        for (let hour = startHour; hour <= endHour; hour++) {
            for (let min=0; min<60; min+=intervalMinutes) {
                slots.push(`${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`);
            }
        }
        return slots;
    }

    // Экранирование текста для безопасности вывода (XSS)
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent= text;
        return div.innerHTML;
    }

    // Создание заголовка таблицы
    function createTableHeader() {
        let headerHtml= '<tr><th>Время</th>';
        for(const day of DAYS_OF_WEEK){
            headerHtml += `<th>${day}</th>`;
        }
        headerHtml += '</tr>';
        return headerHtml;
    }

    // Создание строки таблицы для одного временного слота
    function createTableRow(time){
        let rowHtml= `<tr><td>${time}</td>`;
        for(const day of DAYS_OF_WEEK){
            const activity= findActivity(day,time);
            if(activity){
                rowHtml += `<td>${escapeHtml(activity.name)} <button class="delete-btn" data-id="${activity._id}">Удалить</button></td>`;
            } else{
                rowHtml += '<td></td>';
            }
        }
        rowHtml += '</tr>';
        return rowHtml;
    }

    // Поиск занятия по дню и времени
    function findActivity(day,time){
        return activities.find(a=>a.day===day && a.time===time);
    }

    // Отрисовка всей таблицы расписания
    function renderSchedule() {
        const timeSlots= generateTimeSlots(9,20,30); 
        let html= '<table border="1" cellpadding="5" cellspacing="0"><thead>';
        html += createTableHeader();
        html += '</thead><tbody>';

        for(const time of timeSlots){
            html += createTableRow(time);
        }

        html += '</tbody></table>';
        
        scheduleTableContainer.innerHTML= html;
      }

      // Делегирование кликов по кнопкам удаления
      scheduleTableContainer.addEventListener('click', event => {
          if(event.target.classList.contains('delete-btn')){
              const id= event.target.dataset.id;
              if(confirm('Удалить это занятие?')){
                  deleteActivity(id);
              }
          }
      });

      // Обработка формы добавления занятия
      document.getElementById('activity-form').addEventListener('submit', event => {
          event.preventDefault();

          const nameInput= document.getElementById('activity-name');
          const daySelect= document.getElementById('day');
          const timeInput= document.getElementById('time');
          const durationInput= document.getElementById('duration');

          const name= nameInput.value.trim();
          const day= daySelect.value;
          const timeValue= timeInput.value; 
          const durationMinutes= parseInt(durationInput.value,10);

          if(!name || !day || !timeValue || isNaN(durationMinutes)|| durationMinutes<=0){
              alert('Пожалуйста, заполните все поля корректно.');
              return;
          }

          addActivity({name, day, time: timeValue, duration: durationMinutes});
          
          event.target.reset();
      });

      loadActivities(); // Инициализация при старте

});